# API Gateway — Neo4flix

Le gateway expose une **URL unique** (`http://localhost:8080`) qui route vers
les 4 microservices selon le préfixe d'URL.

---

## 1. Vue d'ensemble

```
                    ┌──────────────────────────────┐
                    │   API Gateway  :8080         │
                    │   Spring Cloud Gateway       │
                    │   (réactif, WebFlux/Netty)   │
                    └──────────────┬───────────────┘
                                   │
       ┌───────────────────────────┼─────────────────────┐
       │                │          │           │         │
       ▼                ▼          ▼           ▼         ▼
   /api/auth/      /api/users/  /api/movies/  /api/ratings/  /api/recommendations/
       │                │          │           │         │
       ▼                ▼          ▼           ▼         ▼
   user      :8082            movie :8081   rating :8083   reco :8084
   service                    service       service        service
```

**Pourquoi un gateway ?**
- 1 URL pour le frontend → pas besoin de configurer 4 hosts différents
- CORS centralisé
- Plus tard : rate limiting, auth, observability, retry, circuit breaker
- En prod : seul le gateway est exposé sur Internet

---

## 2. Routes

| Préfixe public                    | Service downstream                  | Stripped → |
| --------------------------------- | ----------------------------------- | ---------- |
| `POST /api/auth/login`            | user-service `/auth/login`          | `/api`     |
| `POST /api/auth/refresh`          | user-service `/auth/refresh`        | `/api`     |
| `* /api/users/**`                 | user-service `/users/**`            | `/api`     |
| `* /api/movies/**`                | movie-service `/movies/**`          | `/api`     |
| `* /api/ratings/**`               | rating-service `/ratings/**`        | `/api`     |
| `* /api/recommendations/**`       | recommendation-service              | `/api`     |
| `GET /actuator/health` (non préfixé) | gateway lui-même                 | —          |
| `GET /actuator/gateway/routes`    | introspection des routes            | —          |

Le filtre `StripPrefix=1` retire la première segmentation (`/api`) avant le forward.

---

## 3. Lancement

```bash
docker compose up -d --build
```

Et c'est tout. Le gateway fait partie du `docker-compose.yml` — `depends_on`
attend que les 4 services downstream soient `healthy` avant de démarrer.

```bash
$ docker compose ps
neo4flix-gateway          healthy  → :8080   ← ENTRÉE UNIQUE
neo4flix-user             healthy  → :8082
neo4flix-movie            healthy  → :8081
neo4flix-rating           healthy  → :8083
neo4flix-recommendation   healthy  → :8084
neo4flix-neo4j            healthy  → :7474, :7687
```

Les ports 8081-8084 restent **exposés** pour le debug local. En prod,
seul `:8080` (et `:7687` privé pour la DB) seraient ouverts.

---

## 4. Exemples d'utilisation

```bash
# Tous les appels passent par :8080 maintenant.

# Register (public)
curl -X POST http://localhost:8080/api/users \
  -H 'Content-Type: application/json' \
  -d '{"username":"frank","email":"frank@test.io","password":"secret123"}'

# Login → token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usernameOrEmail":"frank","password":"secret123"}' | jq -r .accessToken)

# Endpoints protégés
curl http://localhost:8080/api/movies            -H "Authorization: Bearer $TOKEN"
curl http://localhost:8080/api/users/u1          -H "Authorization: Bearer $TOKEN"
curl http://localhost:8080/api/ratings/users/u1  -H "Authorization: Bearer $TOKEN"
curl http://localhost:8080/api/recommendations/users/u1/by-genre \
                                                 -H "Authorization: Bearer $TOKEN"

# Voir les routes actives
curl http://localhost:8080/actuator/gateway/routes | jq
```

---

## 5. Configuration côté code

### `gateway-service/pom.xml`

Une seule dépendance suffit :

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
```

⚠️ **Pas** de `spring-boot-starter-web` ici — le gateway tourne sur **WebFlux/Netty**, pas Servlet/Tomcat. Mélanger les deux casse le démarrage.

### `application.yml`

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: movie-route
          uri: ${MOVIE_SERVICE_URI:http://movie-service:8081}
          predicates:
            - Path=/api/movies/**
          filters:
            - StripPrefix=1
```

Les URIs utilisent les **hostnames Docker** par défaut, surchargeables via
env vars (ex: `MOVIE_SERVICE_URI=http://localhost:8081` pour dev local).

### CORS — un seul endroit

```yaml
spring:
  cloud:
    gateway:
      globalcors:
        cors-configurations:
          '[/**]':
            allowed-origin-patterns:
              - "http://localhost:4200"
            allowed-methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
            allowed-headers: ["*"]
            allow-credentials: true
            max-age: 3600
```

Avant : il aurait fallu configurer CORS dans **chacun** des 4 services.
Maintenant : seul le gateway connaît le frontend, les services en aval restent agnostiques.

---

## 6. Pourquoi pas de validation JWT au gateway ?

Pour l'instant, **les services downstream valident eux-mêmes le JWT** (via le filter de `common.security`). Le gateway ne fait que pass-through du header `Authorization`.

**Avantages** :
- Defense in depth : si quelqu'un atteint un service directement (port exposé), il est aussi protégé
- Le gateway reste léger / sans état métier

**Possible amélioration** (defense supplémentaire) : valider aussi au gateway, et **rejeter en amont** sans appeler le service downstream. Avantage : moins de charge sur les services. Inconvénient : duplication.

À ajouter plus tard via un `GlobalFilter` Spring Cloud Gateway.

---

## 7. Observability — endpoints actuator

Le gateway expose des endpoints de management :

| URL                                 | Quoi                                  |
| ----------------------------------- | ------------------------------------- |
| `/actuator/health`                  | Healthcheck (utilisé par compose)     |
| `/actuator/info`                    | Métadonnées de build                  |
| `/actuator/gateway/routes`          | Liste des routes actives + uri + filters |
| `/actuator/gateway/routes/{id}`     | Détail d'une route                    |
| `/actuator/gateway/globalfilters`   | Liste des filters globaux             |

```bash
curl http://localhost:8080/actuator/gateway/routes | jq '.[].route_id'
# "auth-route"
# "user-route"
# "movie-route"
# "rating-route"
# "recommendation-route"
```

---

## 8. Pièges connus

| Symptôme                                      | Cause                                                        | Fix                                                                |
| --------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `Empty reply from server` au démarrage        | Spring Cloud version incompatible avec Spring Boot           | Spring Cloud `2023.0.3` pour Boot 3.3.x, `2023.0.4` exige Boot 3.4 |
| Gateway boot OK mais 404 sur tout             | `spring-boot-starter-web` est aussi présent dans pom         | Retirer — gateway = WebFlux uniquement                             |
| 502 Bad Gateway                               | Service downstream pas joignable / pas démarré               | Vérifier `depends_on` + healthchecks                               |
| Préfixe `/api` apparaît dans les logs du service | `StripPrefix=1` oublié                                     | Ajouter `filters: [StripPrefix=1]`                                 |
| CORS ne marche pas malgré config              | Origin différente, ou cookies envoyés sans `allow-credentials: true` | Vérifier `allowed-origin-patterns` (pas `allowed-origins`) si wildcard |
| Token JWT envoyé au gateway mais service répond 401 | Header `Authorization` pas forward                       | Pas de `RemoveRequestHeader=Authorization` dans les filters         |
| `Connection refused` depuis le gateway        | URI utilise `localhost` au lieu du hostname Docker           | `MOVIE_SERVICE_URI=http://movie-service:8081` (pas localhost)      |

---

## 9. Architecture en prod

```
                   Internet
                      │
                      ▼
              ┌──────────────┐
              │ Load Balancer│
              │   (HTTPS)    │
              └──────┬───────┘
                     │
                     ▼
            ┌────────────────┐
            │ API Gateway    │  ← seul exposé
            │ (N replicas)   │
            └────────┬───────┘
                     │
                     ▼  réseau privé
        ┌────────────┴────────────┐
        │                         │
   movie-service              user-service
   (privé)                    (privé)
   N replicas                 N replicas
                                    │
                                    ▼
                              Neo4j (privé)
```

À ajouter pour la prod :
- 🚫 **HTTPS** (TLS termination au LB ou au gateway)
- 🚫 **Rate limiting** par IP / par user (`spring.cloud.gateway.filter.request-rate-limiter` + Redis)
- 🚫 **Circuit breaker** (`Resilience4j` filter) — éviter qu'un service down cascade
- 🚫 **Distributed tracing** — propager `traceparent` via gateway → services
- 🚫 **Auth au gateway** — refuser les tokens invalides avant d'appeler le service
- 🚫 **Sticky sessions** si besoin (WebSockets)

---

## 10. Cheatsheet

```bash
# Tout via le gateway (port 8080)
curl http://localhost:8080/actuator/health
curl http://localhost:8080/actuator/gateway/routes

# Les ports 8081-8084 restent dispo pour debug
curl http://localhost:8081/actuator/health   # movie direct
```

```yaml
# Pour ajouter une nouvelle route, éditer gateway-service/application.yml :
spring:
  cloud:
    gateway:
      routes:
        - id: nouveau-route
          uri: http://nouveau-service:9090
          predicates:
            - Path=/api/nouveau/**
          filters:
            - StripPrefix=1
```

Puis `docker compose up -d --build gateway-service`.
