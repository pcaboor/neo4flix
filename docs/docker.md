# Docker — Neo4flix

Cette doc explique comment la stack est conteneurisée, comment la lancer,
les choix d'architecture, et les pièges connus.

---

## 1. Vue d'ensemble

```
                     ┌───────────────────────────────┐
                     │   Réseau "neo4flix-net"       │
                     │       (bridge interne)        │
                     │                               │
   :7474/:7687 ◄─────┤  neo4j  (image officielle)    │
                     │     ▲                         │
                     │     │ bolt://neo4j:7687       │
                     │     │                         │
   :8081  ◄──────────┤  movie-service                │
   :8082  ◄──────────┤  user-service                 │
   :8083  ◄──────────┤  rating-service               │
   :8084  ◄──────────┤  recommendation-service       │
                     └───────────────────────────────┘
```

5 conteneurs, 1 réseau bridge, 2 volumes (data + logs Neo4j).
Les services dialoguent entre eux par hostname Docker (`neo4j`, `movie-service`, etc.).

---

## 2. Démarrage rapide

```bash
# 1. Préparer les secrets
cp .env.example .env
# Éditer .env si tu veux changer le secret JWT ou le password Neo4j

# 2. Build + run
docker compose up -d --build

# 3. Vérifier
docker compose ps
# Attendre que les 5 services soient "(healthy)"

# 4. Charger les données de démo (1ère fois)
docker exec -i neo4flix-neo4j cypher-shell -u neo4j -p neo4flix123 \
    < neo4j/init/01-constraints.cypher
docker exec -e LANG=C.UTF-8 -e LC_ALL=C.UTF-8 -i neo4flix-neo4j \
    cypher-shell -u neo4j -p neo4flix123 \
    < neo4j/init/02-seed.cypher
```

Tout est ensuite dispo sur :

| URL                                         | Quoi                       |
| ------------------------------------------- | -------------------------- |
| http://localhost:7474                       | Neo4j Browser              |
| http://localhost:8081/swagger-ui.html       | Swagger movie-service      |
| http://localhost:8082/swagger-ui.html       | Swagger user-service       |
| http://localhost:8083/swagger-ui.html       | Swagger rating-service     |
| http://localhost:8084/swagger-ui.html       | Swagger recommendation     |
| http://localhost:808X/actuator/health       | Healthcheck par service    |

### Option HTTPS locale

Let's Encrypt ne fonctionne pas en local, car il faut un domaine public.
Pour le dev local, le projet propose donc :

- `mkcert` si disponible : certificat local signé par une CA de confiance
- `openssl` sinon : certificat self-signed en fallback

Mode HTTP par défaut, inchangé :

```bash
docker compose up -d
# Frontend : http://localhost:8090
```

Mode HTTPS opt-in :

```bash
./scripts/generate-certs.sh
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d
```

Avec l'overlay HTTPS :

| URL                   | Quoi                                      |
| --------------------- | ----------------------------------------- |
| https://localhost     | Frontend en HTTPS                         |
| http://localhost      | Redirection vers `https://localhost`      |
| https://localhost:8090 | Alias de compatibilité vers le frontend HTTPS |

---

## 3. Architecture du Dockerfile

**Un seul Dockerfile au root, paramétré par `ARG SERVICE_NAME`.**

Ça évite la duplication. Chaque service du compose passe son nom en build arg :

```yaml
build:
  context: .
  dockerfile: Dockerfile
  args:
    SERVICE_NAME: movie-service
    HTTP_PORT: "8081"
```

### Stages

```
┌──────────────────────────────┐    ┌──────────────────────────────┐
│  STAGE 1 : builder           │    │  STAGE 2 : runtime           │
│  eclipse-temurin:21-jdk      │    │  eclipse-temurin:21-jre      │
│  + maven                     │    │                              │
│  ─ copie pom (cache deps)    │    │  ─ COPY --from=builder       │
│  ─ mvn dependency:go-offline │ ─► │      app.jar                 │
│  ─ copie sources             │    │  ─ user non-root             │
│  ─ mvn package -pl SERVICE   │    │  ─ HEALTHCHECK actuator      │
│                              │    │  ─ ENTRYPOINT java -jar      │
└──────────────────────────────┘    └──────────────────────────────┘
   image temporaire (≈ 800 MB)         image finale (≈ 280 MB)
```

L'image finale n'embarque **ni Maven ni le JDK**, juste le JRE + le jar — plus léger et moins de surface d'attaque.

### Pourquoi multi-stage ?

| Sans multi-stage           | Avec multi-stage            |
| -------------------------- | --------------------------- |
| 800 MB+ (JDK + Maven inclus) | ≈ 280 MB                  |
| Outils de build dans l'image en prod | Image runtime minimale |
| Sources Java exposées      | Seul le bytecode .jar       |

### Cache des dépendances Maven

```dockerfile
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -pl ${SERVICE_NAME} -am dependency:go-offline -DskipTests
```

Le `--mount=type=cache` (Docker BuildKit) garde `~/.m2` entre les builds. Le 2ᵉ build est **bien plus rapide** que le 1ᵉʳ.

### User non-root

```dockerfile
RUN groupadd --system app && useradd --system --gid app --home-dir /app app
USER app
```

Bonne pratique sécu : si quelqu'un échappe du conteneur, il n'est pas `root` sur l'hôte.

### Healthcheck

```dockerfile
HEALTHCHECK CMD wget -qO- http://localhost:${HTTP_PORT}/actuator/health \
    | grep -q '"status":"UP"' || exit 1
```

Permet à `docker compose ps` d'afficher `(healthy)` et au compose
d'attendre qu'un service soit prêt avant de démarrer un dépendant.

---

## 4. docker-compose — choix d'architecture

### YAML anchors pour DRY

```yaml
x-spring-env: &spring-env
  SPRING_NEO4J_URI: bolt://neo4j:7687
  ...

services:
  movie-service:
    environment:
      <<: *spring-env       # ← inclut tous les env partagés
      SERVER_PORT: "8081"
```

`x-*` = clés privées non lues comme des services. `&spring-env` = ancre,
`<<: *spring-env` = inclusion. Tout changement de secret/URI : un seul
endroit à modifier.

### Networking

Tous les services sont sur le réseau `neo4flix-net` (bridge isolé).
Ils se résolvent par leur **nom de service** (DNS interne Docker) :

```yaml
SPRING_NEO4J_URI: bolt://neo4j:7687
```

Pas `localhost:7687` — `localhost` dans un conteneur, c'est le conteneur
lui-même, pas l'hôte ni le voisin.

### Mapping de ports

```yaml
ports:
  - "8081:8081"
```

Format : `<port hôte>:<port conteneur>`. Sans cette ligne, le service
serait invisible depuis l'hôte (mais accessible aux autres services sur
le réseau Docker).

Les ports vers l'hôte ne sont utiles **que** pour les tests / le frontend.
En prod, on n'expose souvent qu'un API gateway.

### `depends_on` avec condition

```yaml
depends_on:
  neo4j:
    condition: service_healthy
```

Le service ne démarre que quand Neo4j est `healthy` — pas juste démarré.
Évite les "Connection refused" quand un service Spring démarre avant que
la base soit prête.

### Persistance Neo4j

```yaml
volumes:
  - neo4j_data:/data        # graphe persistant
  - neo4j_logs:/logs
  - ./neo4j/init:/var/lib/neo4j/import   # bind mount pour CSV / scripts
```

`docker compose down` garde les volumes nommés.
`docker compose down -v` les supprime (perte de données).

---

## 5. Variables d'environnement — comment ça marche

Spring Boot **lit automatiquement** les env vars en *kebab-case* qui
correspondent aux propriétés YAML :

| YAML                                          | Env var équivalente                             |
| --------------------------------------------- | ----------------------------------------------- |
| `spring.neo4j.uri`                            | `SPRING_NEO4J_URI`                              |
| `spring.neo4j.authentication.password`        | `SPRING_NEO4J_AUTHENTICATION_PASSWORD`          |
| `server.port`                                 | `SERVER_PORT`                                   |
| `neo4flix.security.jwt.secret`                | `NEO4FLIX_JWT_SECRET`                           |

Règle : MAJUSCULES, points → underscores, tirets → underscores.

### Surcharge en cascade

Spring lit les sources de config dans cet ordre (la plus tardive gagne) :

1. `application.yml` du jar
2. `application-{profile}.yml`
3. **Variables d'environnement** ← compose les passe ici
4. Arguments JVM (`--spring.neo4j.uri=...`)

Donc même si `application.yml` dit `bolt://localhost:7687`,
le compose surcharge avec `bolt://neo4j:7687` au runtime.

---

## 6. Commandes utiles

### Vie de la stack

```bash
docker compose up -d              # démarrer (build si pas d'image)
docker compose up -d --build      # forcer le rebuild
docker compose ps                 # état
docker compose stop               # stop (relance rapide possible)
docker compose down               # stop + supprime conteneurs (volumes gardés)
docker compose down -v            # + supprime volumes (DB perdue)
docker compose restart movie-service   # redémarrer un seul
```

### Build incrémental d'un seul service

```bash
docker compose build movie-service
docker compose up -d movie-service
```

### Logs

```bash
docker compose logs -f                     # tous, en suivi
docker compose logs -f --tail=100 movie-service
docker compose logs --since 5m user-service
```

### Shell dans un conteneur

```bash
docker exec -it neo4flix-movie sh
docker exec -it neo4flix-neo4j cypher-shell -u neo4j -p neo4flix123
```

### Inspection

```bash
docker compose config              # voir le compose résolu (avec env subst)
docker compose images              # tag + taille
docker network inspect neo4flix_neo4flix-net
```

---

## 7. Workflow de dev

Quand tu modifies du code :

1. **Code Java seulement** : rebuild + restart le service concerné
   ```bash
   docker compose up -d --build movie-service
   ```

2. **Modif de `common`** : rebuilder TOUS les services qui en dépendent (= les 4)
   ```bash
   docker compose build && docker compose up -d
   ```

3. **Modif de `pom.xml`** : pareil, idéalement `--no-cache`
   ```bash
   docker compose build --no-cache <service>
   ```

4. **Modif d'`application.yml`** : un simple restart suffit
   ```bash
   docker compose up -d --build movie-service
   ```

### Astuce : pas besoin de Docker pour itérer

Pour le dev rapide, **ne dockerise pas Spring Boot**. Garde Neo4j en
Docker, mais lance le service avec ton IDE / `mvn spring-boot:run`.
Itération en secondes au lieu de 30s+ par rebuild.

```bash
docker compose up -d neo4j
mvn -pl movie-service spring-boot:run
```

Quand le code est stable, tu testes le tout en compose.

---

## 8. Pièges connus

| Symptôme                                         | Cause                                          | Fix                                     |
| ------------------------------------------------ | ---------------------------------------------- | --------------------------------------- |
| `Connection refused` Neo4j au démarrage du service | URI = `localhost:7687` au lieu de `neo4j:7687` | env var `SPRING_NEO4J_URI` du compose  |
| Build long à chaque modif d'un fichier Java       | Pas de cache BuildKit                          | export `DOCKER_BUILDKIT=1` (par défaut sur Docker récents) |
| `pom.xml` modifié → tout retéléchargé à chaque build | Cache Maven non monté                       | `--mount=type=cache,target=/root/.m2`   |
| Token JWT rejeté entre services en compose       | `NEO4FLIX_JWT_SECRET` différent (default fallback) | définir dans `.env` partagé          |
| `docker compose ps` montre `unhealthy`           | Healthcheck qui boucle sur 401 pré-startup     | `--start-period` long enough (30s)      |
| Ports `8081-8084` déjà pris sur l'host           | Tu as des `mvn spring-boot:run` qui tournent encore | `pkill -f "<service>-0"` ou changer mapping `808X:808X` → `91XX:808X` |
| Perte des données après `down`                    | `down -v` supprime les volumes                | utiliser `down` simple                  |
| Caractères accentués cassés au seed              | locale par défaut du conteneur Neo4j ≠ UTF-8   | `docker exec -e LANG=C.UTF-8 -e LC_ALL=C.UTF-8 ...` |

---

## 9. Production — ce qui manque

Cette stack est faite pour **dev / démo locale**. Pour la prod il faudrait :

- 🚫 **Pas Neo4j Community en compose seul** — passer en Aura (managed) ou cluster auto-failover
- 🚫 **Pas de mot de passe en clair** dans `.env` — vault / secrets k8s
- 🚫 **Pas de port `7687/7474` exposé sur Internet** — Neo4j en réseau privé uniquement
- 🚫 **TLS partout** — HTTPS sur les services, Bolt+S sur Neo4j
- 🚫 **Pas un compose** — Kubernetes (helm chart) avec replicas, HPA, PodDisruptionBudget
- 🚫 **Pas de monitoring** — Prometheus + Grafana, logs centralisés (Loki / ELK)
- 🚫 **CI/CD** — build des images dans GitHub Actions, push vers un registry, deploy automatique

---

## 10. Cheatsheet

```bash
# Tout démarrer (1ère fois)
cp .env.example .env
docker compose up -d --build

# Vérifier
docker compose ps
curl http://localhost:8082/actuator/health

# Login → token
TOKEN=$(curl -s -X POST localhost:8082/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usernameOrEmail":"alice","password":"..."}' | jq -r .accessToken)

# Appel protégé via les ports exposés par le compose
curl localhost:8081/movies -H "Authorization: Bearer $TOKEN"

# Rebuild d'un seul service après modif
docker compose up -d --build movie-service

# Tuer + nettoyer (garde la DB)
docker compose down

# Tout nuker (DB perdue)
docker compose down -v
```
