# syntax=docker/dockerfile:1.7
# ============================================================
# Frontend Angular dockerisé.
# Stage 1 : build (Node 20 + Angular CLI)
# Stage 2 : runtime (nginx alpine, ~25 MB final)
# ============================================================

# --------- STAGE 1 : build ---------
FROM node:20-alpine AS builder

WORKDIR /build

# Cache des dépendances : on ne réinstalle que si package*.json change.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Sources + config
COPY tsconfig*.json ./
COPY angular.json ./
COPY tailwind.config.js postcss.config.js ./
COPY src ./src

# Build production (configuration "production" → fileReplacement vers environment.prod.ts)
RUN npm run build

# --------- STAGE 2 : runtime nginx ---------
FROM nginx:alpine

# Remplace la conf par défaut
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/neo4flix.conf

# Copie le bundle Angular
COPY --from=builder /build/dist/neo4flix-frontend/browser /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD wget -qO- http://localhost/health || exit 1

# nginx tourne en root par défaut pour binder le port 80, c'est le standard de l'image officielle.
CMD ["nginx", "-g", "daemon off;"]
