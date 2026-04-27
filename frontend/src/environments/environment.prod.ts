/**
 * Configuration de runtime — build de production.
 *
 * apiBaseUrl est relatif (= "/api"), pas absolu : nginx (qui sert le bundle)
 * fait un reverse-proxy de /api/* vers le gateway-service. L'image frontend
 * est ainsi indépendante de l'host (pas de hardcode "localhost:8080").
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api'
};
