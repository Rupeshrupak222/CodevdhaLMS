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


export const generateAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
};

export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
};

export const generateTempToken = (payload: TempTokenPayload): string => {
  // Use access secret for temp tokens, but short expiry
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '10m', // 10 minutes temporary validity
  });
};

export const verifyTempToken = (token: string): TempTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TempTokenPayload;
};

