/**
 * Configuration de runtime du frontend.
 *
 * apiBaseUrl pointe sur l'API gateway. En dev local on tape directement
 * le gateway docker (port 8080). Pour un build prod servi par nginx
 * avec un reverse-proxy /api, on mettrait juste '/api'.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api'
};
