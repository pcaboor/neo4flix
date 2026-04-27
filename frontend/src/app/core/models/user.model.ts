// Aligné sur io.neo4flix.user.api.dto.UserDto (passwordHash exclu)
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  twoFactorEnabled: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: User;
}

/**
 * Réponse de POST /auth/login : peut être soit des tokens (2FA off),
 * soit un challenge 2FA (ticket à présenter à /auth/login/2fa).
 */
export interface LoginResult {
  requires2fa: boolean;
  // si requires2fa = false :
  accessToken?: string;
  refreshToken?: string;
  tokenType?: 'Bearer';
  expiresInSeconds?: number;
  user?: User;
  // si requires2fa = true :
  twoFactorTicket?: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  provisioningUri: string;
  qrCodeDataUri: string;
}
