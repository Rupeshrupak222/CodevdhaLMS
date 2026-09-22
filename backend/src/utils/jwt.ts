import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  userId: string;
  role: string;
  email: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export interface TempTokenPayload {
  userId: string;
  role: string;
}

// Pin the signing algorithm on both sign and verify.
// This blocks the classic `alg: none` bypass and RS<->HS algorithm-confusion
// attacks — a forged token declaring a different algorithm will be rejected.
const ALGORITHM: jwt.Algorithm = 'HS256';

export const generateAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
};

export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: [ALGORITHM],
  }) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: [ALGORITHM],
  }) as RefreshTokenPayload;
};

export const generateTempToken = (payload: TempTokenPayload): string => {
  // Use access secret for temp tokens, but short expiry
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: '10m', // 10 minutes temporary validity
  });
};

export const verifyTempToken = (token: string): TempTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: [ALGORITHM],
  }) as TempTokenPayload;
};

// Decode a token WITHOUT verifying its signature. Only use for reading
// non-sensitive metadata (e.g. `exp`) from a token that was already verified,
// such as computing a blacklist expiry on logout.
export const decodeJwt = (token: string): { exp?: number } | null => {
  const decoded = jwt.decode(token);
  if (decoded && typeof decoded === 'object') {
    return decoded as { exp?: number };
  }
  return null;
};
