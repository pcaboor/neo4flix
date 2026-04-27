// Aligné sur io.neo4flix.user.api.dto.UserDto (passwordHash exclu)
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
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
