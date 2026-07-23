export interface JwtPayload {
  sub: string;        // userId
  email: string;
  role: string;
  companyId?: string; // null/undefined = usuário de plataforma (MASTER)
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  senha: string;
}
