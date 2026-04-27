# syntax=docker/dockerfile:1.7
# ============================================================
# Dockerfile générique pour les microservices Neo4flix.
# Utilisé par les 4 services via build arg SERVICE_NAME.
# Multi-stage : builder (JDK + Maven) → runtime (JRE seul, plus léger).
# ============================================================

# --------- STAGE 1 : builder ---------
FROM eclipse-temurin:21-jdk-jammy AS builder

# Maven embarqué (pas de wrapper dans le projet pour l'instant)
RUN apt-get update && apt-get install -y --no-install-recommends maven \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Quel module construire (passé par docker-compose)
ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

# 1) On copie d'abord uniquement les pom.xml pour que Docker
#    puisse mettre en cache la résolution des dépendances tant
#    qu'on ne touche pas aux poms.
COPY pom.xml ./
COPY common/pom.xml common/
COPY movie-service/pom.xml movie-service/
COPY user-service/pom.xml user-service/
COPY rating-service/pom.xml rating-service/
COPY recommendation-service/pom.xml recommendation-service/
COPY gateway-service/pom.xml gateway-service/

# 2) Pré-fetch des dépendances. -am = also-make (inclut common comme dépendance).
#    --mount=type=cache : Docker BuildKit cache pour ~/.m2 inter-builds.
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -pl ${SERVICE_NAME} -am dependency:go-offline -DskipTests || true

# 3) Sources
COPY common/src common/src
COPY ${SERVICE_NAME}/src ${SERVICE_NAME}/src

# 4) Build
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -pl ${SERVICE_NAME} -am clean package -DskipTests

# 5) Le jar Spring Boot a un nom prévisible. On le copie dans /build/app.jar
#    pour ne pas avoir à passer SERVICE_NAME au stage runtime.
RUN cp ${SERVICE_NAME}/target/${SERVICE_NAME}-*.jar /build/app.jar

# --------- STAGE 2 : runtime ---------
FROM eclipse-temurin:21-jre-jammy

# Utilisateur non-root (sécu)
RUN groupadd --system app && useradd --system --gid app --home-dir /app --create-home app

WORKDIR /app
COPY --from=builder --chown=app:app /build/app.jar app.jar

USER app

# Healthcheck — utilise actuator (public, pas de JWT requis)
ARG HTTP_PORT=8080
ENV HTTP_PORT=${HTTP_PORT}
EXPOSE ${HTTP_PORT}
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=10 \
    CMD wget -qO- "http://localhost:${HTTP_PORT}/actuator/health" 2>/dev/null \
        | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["java","-XX:MaxRAMPercentage=75","-jar","/app/app.jar"]
