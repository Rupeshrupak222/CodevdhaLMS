import crypto from 'crypto';

// Generate a cryptographically secure verify ID for certificates
// Format: ADY-XXXXXXXXXXXXXXXX (16 uppercase hex chars = 8 random bytes)
// 8 bytes = 18.4 quintillion possibilities — negligible collision risk
export const generateVerifyId = (): string => {
  const hex = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `ADY-${hex}`;
};

// Hash a token for safe DB storage
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Generate a random hex token (for password reset, etc.)
export const generateSecureToken = (bytes: number = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};
