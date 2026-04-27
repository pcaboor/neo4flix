# Frontend Angular — Neo4flix

Application Angular 19 connectée à l'API Gateway, organisée en standalone
components avec signals et TailwindCSS.

---

## 1. Stack

| Couche             | Choix                                |
| ------------------ | ------------------------------------ |
| Framework          | Angular 19 (standalone, signals)     |
| Style              | TailwindCSS 3.4 (palette custom)     |
| Forms              | Reactive Forms (`FormBuilder`)       |
| HTTP               | `HttpClient` + interceptor fonction  |
| State              | Signals + services (`@Injectable({ providedIn: 'root' })`) |
| Routing            | Lazy `loadComponent()` + guards      |
| Build              | esbuild (Angular CLI 19)             |
| Storage            | `localStorage` (tokens)              |

Pas de NgModule, pas de NgRx, pas de Material — KISS.

---

## 2. Démarrage

```bash
# Backend en route (port 8080 = gateway)
docker compose up -d

# Frontend dev server
cd frontend
npm install
npm start            # → http://localhost:4200
```

Pour la prod :
```bash
npm run build        # → dist/neo4flix-frontend/
```

`environment.apiBaseUrl` pointe sur `http://localhost:8080/api` (le gateway).
Pour un build prod servi par nginx avec un reverse-proxy `/api`, mettre `'/api'`.

---

## 3. Structure

```
src/app/
├── app.component.ts        ← root <router-outlet>
├── app.config.ts           ← providers (router, interceptor)
├── app.routes.ts           ← lazy routes
├── core/                   ← code transverse, jamais d'UI
│   ├── auth/
│   │   ├── token-storage.ts        wrapper localStorage
│   │   ├── auth.service.ts         signal currentUser, login/refresh/logout
│   │   ├── auth.interceptor.ts     Bearer + refresh auto sur 401
│   │   └── auth.guard.ts           authGuard / guestGuard
│   ├── api/                        4 services HTTP (un par microservice)
│   ├── models/                     interfaces TypeScript = records Java
│   └── toast/toast.service.ts      file globale de notifications
├── features/               ← une page = un dossier
│   ├── auth/login + register
│   ├── catalog                     /movies (recherche + filtres)
│   ├── movie-detail                /movies/:id (rating + watchlist + similaires)
│   ├── watchlist                   /watchlist
│   ├── recommendations             /recommendations
│   ├── profile                     /profile
│   └── users                       /users
└── shared/
    ├── components/                 movie-card, star-rating, toast-host
    └── layout/app-shell            navbar + outlet pour routes auth
```

**Convention** :
- `core/` ne dépend de rien sous `features/` ou `shared/`.
- `features/X` peut dépendre de `core/` et `shared/` mais pas de `features/Y`.
- `shared/` ne dépend que de `core/`.

---

## 4. Auth flow — comment ça marche

```
┌─────────────┐                    ┌──────────────┐                ┌──────────────┐
│   Login     │ ────login()───►    │ AuthService  │ ──HTTP─────►   │   Gateway    │
│  Component  │                    │              │                │  /api/auth   │
└─────────────┘ ◄───OK + tokens────│ + signal set │ ◄──tokens──────│              │
                                   │ + storage    │                └──────────────┘
                                   └──────┬───────┘
                                          │
                          ┌───────────────┴───────────────┐
                          ▼                               ▼
                  ┌──────────────┐                ┌──────────────┐
                  │    Guard     │ ──refuse────►  │  /login      │
                  │ canActivate  │                │  redirect    │
                  └──────────────┘                └──────────────┘

   Pour chaque requête sortante :

   request → [auth interceptor] → ajoute Bearer header → next
                                                        │
                                                        ▼
                                              service downstream
                                                        │
                              401 ◄──────── peut renvoyer 401 (token expiré)
                               │
                               ▼
                        [auth interceptor again]
                               │
                               ▼
                        AuthService.refresh()
                               │
                               ├── OK → retry la requête originale avec nouveau token
                               └── KO → logout() → redirect /login
```

### Réentrance de refresh

L'interceptor utilise un `BehaviorSubject<string|null>` partagé.
Si **plusieurs requêtes parallèles** se prennent un 401 en même temps :
- Seule la **première** déclenche un `refresh()`.
- Les autres attendent (`filter(t => t !== null)`) puis se rejouent avec
  le nouveau token quand il arrive.

Sinon on aurait N refreshs simultanés → race condition + 4 requêtes au gateway.

---

## 5. Pattern signals — pourquoi pas RxJS partout ?

### Pour l'état local des composants → **signals**

```ts
protected movies = signal<Movie[]>([]);
protected loading = signal(true);

constructor() {
  this.api.list().subscribe(ms => {
    this.movies.set(ms);
    this.loading.set(false);
  });
}
```

Dans le template, `movies()` et `loading()` réagissent automatiquement.
Pas besoin d'`async` pipe, pas de `BehaviorSubject` à exposer.

### Pour les flux HTTP / réactivité combinée → **RxJS**

```ts
this.search.valueChanges.pipe(
  debounceTime(250),
  distinctUntilChanged(),
  switchMap(q => this.api.list(q))
).subscribe(...)
```

RxJS reste pertinent pour le pipeline (debounce, switchMap, forkJoin).
Le résultat final est poussé dans un signal pour le rendu.

### Pour partager un état global → **signals dans un service**

```ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User|null>(null);
  readonly currentUser = computed(() => this._user());
}
```

N'importe quel composant peut faire `auth.currentUser()` sans subscribe.

---

## 6. Pages clés

### Catalogue (`/movies`)

- Recherche par titre debounced 250ms
- Filtre genre (sélecteur)
- Skeleton loaders pendant le chargement
- État vide explicite ("Aucun film…")
- Cards cliquables → fiche

### Fiche film (`/movies/:id`)

5 appels API en parallèle via `forkJoin` :
- `GET /movies/{id}` — détail
- `GET /ratings/movies/{id}/stats` — moyenne + count
- `GET /ratings/movies/{id}` — toutes les notes (pour récupérer la mienne + récentes)
- `GET /users/{me}/watchlist` — savoir si je l'ai sauvegardé
- `GET /recommendations/movies/{id}/similar` — films similaires

Path variable `:id` bindé automatiquement via `withComponentInputBinding()` +
`id = input.required<string>()`.

Actions :
- **Noter** (StarRating cliquable) → `PUT /ratings/users/{me}/movies/{id}` (idempotent)
- **Watchlist toggle** → `PUT/DELETE /users/{me}/watchlist/{id}`
- Toast feedback systematique

### Recommandations (`/recommendations`)

3 stratégies en sections séparées :
- 🎯 Par genre préféré
- 🤝 Collaboratif (users similaires)
- 👥 Depuis followings

Chaque section a son propre state (loading, data) → si une stratégie n'a pas
de résultat (peu de données), les autres s'affichent quand même.

### Profil (`/profile`)

- Form profil (`PATCH /users/{me}`) — disabled tant que pristine ou invalid
- Form password (`PUT /users/{me}/password`)
- Listes followings (avec unfollow inline) + followers (read-only)

### Users (`/users`)

- Recherche debounced sur `?username=`
- Set des userIds que je suis → toggle visuel du bouton
- Filtre soi-même de la liste via `computed(visibleUsers)`

---

## 7. Composants partagés

### `MovieCardComponent`

```ts
<app-movie-card [movie]="m" />
```

Carte cliquable utilisée dans catalogue, watchlist, recommandations.
Génère un placeholder à partir des initiales du titre si `posterUrl` est null.

### `StarRatingComponent`

```ts
<!-- Lecture seule -->
<app-star-rating [rating]="4.5" [readonly]="true" [showLabel]="true" />

<!-- Interactif -->
<app-star-rating [rating]="myScore" (rated)="rate($event)" />
```

Hover effect en mode interactif. Inputs : `rating`, `readonly`, `size`, `showLabel`.
Output : `rated: number`.

### `ToastHostComponent` + `ToastService`

```ts
toast.success('Profil mis à jour');
toast.error('Erreur réseau');
toast.info('Vous ne suivez plus cet utilisateur');
```

Le service expose un `signal<Toast[]>`. Le host (dans `AppShell`) parcourt
ce signal. Auto-dismiss après 3.5s. Slide-in CSS.

---

## 8. Pièges connus

| Symptôme                                          | Cause                                            | Fix                                              |
| ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `NG5002: Opening tag "div" not terminated`        | Tailwind arbitrary values `[260px]` interprétées comme bindings Angular | Utiliser une classe utilitaire (`min-w-64`) ou du CSS dans `styles:` |
| Refresh boucle infinie                            | L'endpoint `/auth/refresh` envoie aussi un Bearer | Skip dans l'interceptor (`isAuthEndpoint`)       |
| Plusieurs refresh en parallèle                    | Pas de réentrance                                | `BehaviorSubject` partagé + `filter(non-null)`   |
| `passwordHash` exposé en JSON                     | Sérialisation de l'entité directement            | Toujours passer par un DTO côté backend (déjà OK) |
| Form pristine après `patchValue`                  | `markAsPristine()` non appelé après save         | Appeler explicitement                            |
| Path variable `:id` undefined                     | `withComponentInputBinding()` non activé         | Dans `provideRouter(routes, withComponentInputBinding())` |
| 401 silencieux sur appels parallèles              | Erreur sur une promise non gérée                 | `.subscribe({ error: ... })` ou `catchError`     |
| Build prod budget dépassé                         | Image / asset trop gros                          | Augmenter le budget dans `angular.json` ou optimiser |

---

## 9. Évolutions possibles

- 🚫 **SSR / Hydration** (`@angular/ssr`) — meilleur SEO, premier paint plus rapide
- 🚫 **PWA** (`@angular/pwa`) — installable, offline cache
- 🚫 **Tests Jest/Karma** + cypress E2E
- 🚫 **i18n** — la trad existe en Angular `@angular/localize`
- 🚫 **NgRx Signal Store** quand l'état partagé devient complexe
- 🚫 **CSP** + `httpOnly` cookies au lieu de localStorage (XSS hardening)
- 🚫 **Skeleton plus poussé** avec content-aware (titres flous, etc.)
- 🚫 **Image optimization** avec `NgOptimizedImage` (`<img ngSrc="...">`)
- 🚫 **Service Worker** pour cache des films et assets

---

## 10. Cheatsheet

```bash
# Dev
npm start                            # ng serve sur :4200
npm run build                        # build prod dans dist/

# Maintenir le typage strict
# tsconfig.json : strictTemplates, strictInjectionParameters, strict

# Quand on ajoute une route
src/app/app.routes.ts                # déclarer (loadComponent)
src/app/shared/layout/app-shell.ts   # ajouter le lien dans la navbar

# Quand on ajoute un appel API
src/app/core/api/<service>-api.ts    # méthode dans le service correspondant
src/app/core/models/<X>.ts           # interface si nouveau DTO
```
