# Sécurité JWT — Neo4flix

Cette doc explique comment l'authentification JWT est implémentée sur les 4 microservices,
comment l'utiliser côté client, et les pièges à connaître.

---

## 1. Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Angular)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
       ① POST /auth/login (user-service)
                       │
                       ▼
   ┌──────────────────────────────────────────┐
   │     user-service:8082  /auth/*           │
   │  ─ vérifie password (BCrypt)             │
   │  ─ émet access token (1h)                │
   │  ─ émet refresh token (30j)              │
   └──────────────────────────────────────────┘
                       │
       ② Authorization: Bearer <access>
                       │
                       ▼
   ┌──────────────────────────────────────────┐
   │   movie / user / rating / recommendation │
   │   chacun valide la signature du token    │
   │   via SECRET partagé (HS256)             │
   └──────────────────────────────────────────┘
```

**Principes :**
- Stateless — pas de session côté serveur, le token porte l'identité
- Secret HS256 partagé sur les 4 services (configurable via env var)
- Tous les endpoints protégés par défaut sauf liste blanche

---

## 2. Flow client

### Login

```bash
curl -X POST http://localhost:8082/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usernameOrEmail":"alice","password":"secret123"}'
```

Réponse :
```json
{
  "accessToken":  "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "tokenType": "Bearer",
  "expiresInSeconds": 3600,
  "user": { "id": "u1", "username": "alice", "email": "alice@neo4flix.io", ... }
}
```

`usernameOrEmail` accepte les **deux** : `"alice"` ou `"alice@neo4flix.io"`.

### Appel d'un endpoint protégé

```bash
curl http://localhost:8081/movies \
  -H "Authorization: Bearer <accessToken>"
```

### Refresh quand l'access expire

```bash
curl -X POST http://localhost:8082/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refresh>"}'
```

Le client doit :
1. Tenter l'appel avec l'access token
2. Si **401**, appeler `/auth/refresh`
3. Réessayer avec le nouveau access
4. Si refresh aussi en 401 → re-login

---

## 3. Endpoints publics (pas de token requis)

| Méthode | Route                              | Service              |
| ------- | ---------------------------------- | -------------------- |
| POST    | `/auth/login`                      | user-service         |
| POST    | `/auth/refresh`                    | user-service         |
| POST    | `/users`                           | user-service (register) |
| GET     | `/actuator/health`, `/actuator/info` | tous              |
| GET     | `/swagger-ui/**`, `/v3/api-docs/**` | tous (DX)           |

**Tout le reste exige un access token valide** ou renvoie `401`.

---

## 4. Anatomie du token

Décode un token sur https://jwt.io pour voir le contenu (les JWT ne sont **pas** chiffrés, juste signés).

### Header
```json
{ "alg": "HS384" }
```

### Payload (claims)
```json
{
  "sub": "u1",                  ← user id
  "iss": "neo4flix",
  "iat": 1714208400,
  "exp": 1714212000,            ← +1h pour access
  "username": "alice",
  "type": "access"              ← ou "refresh"
}
```

### Signature

`HMAC-SHA256(header.payload, secret)` — c'est la signature qui garantit qu'un token n'a pas été altéré et qu'il a bien été émis par notre auth.

---

## 5. Configuration

Toutes les options sont dans `application.yml` sous le préfixe `neo4flix.security.jwt` :

```yaml
neo4flix:
  security:
    jwt:
      secret: ${NEO4FLIX_JWT_SECRET:change-me-please-this-is-not-a-prod-secret-32chars}
      access-token-ttl: PT1H       # ISO-8601 duration → 1 heure
      refresh-token-ttl: P30D      # 30 jours
      issuer: neo4flix
```

### Override en local

```bash
export NEO4FLIX_JWT_SECRET="mon-super-secret-de-32-caracteres-au-moins"
```

### Contraintes

- `secret` ≥ **32 caractères** (256 bits requis par HS256). Plus court → exception au démarrage.
- Le secret doit être **identique** sur les 4 services. Sinon un token émis par user-service sera rejeté par movie-service avec `401`.

---

## 6. Architecture côté code

### `common/security/`

| Classe                       | Rôle                                                 |
| ---------------------------- | ---------------------------------------------------- |
| `JwtProperties`              | Bind YAML → POJO (`@ConfigurationProperties`)        |
| `JwtTokenService`            | `issueAccessToken`, `issueRefreshToken`, `parse`     |
| `JwtAuthenticationFilter`    | Lit `Authorization: Bearer ...` → `SecurityContext`  |
| `JwtAuthEntryPoint`          | Renvoie 401 JSON normalisé (au lieu du HTML default) |
| `AuthenticatedUser`          | `Authentication` custom — principal = userId         |
| `SecurityConfig`             | `SecurityFilterChain` partagé : whitelist + JWT      |

### `user-service`

| Classe                     | Rôle                                            |
| -------------------------- | ----------------------------------------------- |
| `AuthController`           | `POST /auth/login`, `POST /auth/refresh`        |
| `AuthService`              | Vérifie password, émet tokens, gère le refresh  |
| `LoginRequest`, `RefreshTokenRequest`, `TokenResponse` | DTOs |

### Comment chaque service récupère la sécu

Chaque `*ServiceApplication.java` :

```java
@SpringBootApplication(scanBasePackages = "io.neo4flix")  // ← clé !
public class MovieServiceApplication { ... }
```

Sans `scanBasePackages`, Spring Boot ne scanne que le package du service
(`io.neo4flix.movie.*`) et ne trouverait jamais les beans de `common.security`.

---

## 7. Récupérer l'utilisateur courant dans un controller

```java
@GetMapping("/me")
public UserDto currentUser(Authentication auth) {
    String userId = auth.getName();             // → "u1"
    AuthenticatedUser u = (AuthenticatedUser) auth;
    String username = u.getUsername();          // → "alice"
    return service.findById(userId);
}
```

Ou dans le service via `SecurityContextHolder` :

```java
String userId = SecurityContextHolder.getContext().getAuthentication().getName();
```

---

## 8. Règles "self only" — `@PreAuthorize`

`@EnableMethodSecurity` est activé dans `SecurityConfig`. On peut donc protéger
n'importe quelle méthode :

```java
@PatchMapping("/{id}")
@PreAuthorize("#id == authentication.principal")
public UserDto update(@PathVariable String id, @Valid @RequestBody UpdateUserRequest req) {
    return UserDto.from(service.update(id, req));
}
```

Si un autre user appelle cet endpoint avec un id qui n'est pas le sien : `403 Forbidden`.

### SpEL pratiques

| Expression                                    | Sens                              |
| --------------------------------------------- | --------------------------------- |
| `authentication.principal`                    | userId courant                    |
| `authentication.name`                         | userId courant (pareil)           |
| `#id == authentication.principal`             | path var `{id}` == user courant   |
| `hasAuthority('ADMIN')`                       | rôle ADMIN (pas implémenté)       |
| `permitAll()`                                 | toujours autorisé                 |

---

## 9. Tester en local avec curl

### Helper : récupérer un token

```bash
TOKEN=$(curl -s -X POST http://localhost:8082/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usernameOrEmail":"alice","password":"secret123"}' \
  | jq -r .accessToken)

curl http://localhost:8081/movies -H "Authorization: Bearer $TOKEN"
```

### Tester l'expiration

Mets un TTL court dans le `yml` (ex: `access-token-ttl: PT10S`), redémarre,
attends 11 secondes après le login, refais l'appel → `401`.

---

## 10. Pièges connus

| Symptôme                                    | Cause                                                  | Fix                                                  |
| ------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| `IllegalStateException: secret doit faire ≥ 32 caractères` au démarrage | secret YAML trop court | Mettre 32+ caractères                |
| 401 sur tous les endpoints (même publics) | Filter manquant ou ordre incorrect dans la chaîne | Vérifier que `common` est dépendance + `scanBasePackages = "io.neo4flix"` |
| Token valide rejeté par un service B       | Secret différent entre A (émetteur) et B (vérif)       | Synchroniser `NEO4FLIX_JWT_SECRET` partout           |
| `403 Forbidden` (pas 401)                  | Token valide mais `@PreAuthorize` rejette              | Cohérent : authentifié mais pas autorisé             |
| Refresh accepté comme access token          | Filter ne vérifie pas le claim `type`                  | Déjà géré dans `JwtAuthenticationFilter`             |
| `JWT::sign` fonctionne mais `parse` non    | `iss` configuré différemment                           | `requireIssuer` doit matcher `JwtProperties.issuer`  |

---

## 11. Limites actuelles + roadmap sécurité

### Pas encore fait
- 🚫 **Logout / blacklist** — un access token compromis reste valide jusqu'à expiration. Solution typique : Redis blacklist.
- 🚫 **Rotation des refresh tokens** — un refresh actuel peut être réutilisé indéfiniment. Bonne pratique : émettre un nouveau refresh à chaque appel `/auth/refresh` et invalider l'ancien.
- 🚫 **Rôles / permissions** — pour l'instant tout user authentifié = même droits. Ajouter `roles: ['USER', 'ADMIN']` dans le claim et utiliser `hasAuthority`.
- 🚫 **Rate limiting** sur `/auth/login` — pour limiter les attaques par brute force.
- 🚫 **2FA** — TOTP via authenticator (étape 7+).
- 🚫 **Cookies HttpOnly** — alternative à `Authorization` header pour XSS-resistance (mais CSRF à gérer).
- 🚫 **CORS** — non configuré ; à faire avant le frontend Angular.

### Pour la prod
- Passer **HS256 → RS256** (clé asymétrique)
- Secret/clé en **vault** (HashiCorp / AWS Secrets Manager / sealed-secrets sur k8s)
- TLS obligatoire — un JWT en clair sur HTTP = vol garanti
- Logger les `iat` / `exp` pour traçabilité
- Monitoring : nb 401, latence `/auth/login`, taille SecurityContext

---

## 12. Cheatsheet

```bash
# Login → garder le token
TOKEN=$(curl -s -X POST localhost:8082/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usernameOrEmail":"alice","password":"..."}' | jq -r .accessToken)

# Appel protégé
curl localhost:8081/movies -H "Authorization: Bearer $TOKEN"

# Refresh
NEW=$(curl -s -X POST localhost:8082/auth/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}" | jq -r .accessToken)

# Décoder un JWT (sans vérifier la signature)
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null
```
