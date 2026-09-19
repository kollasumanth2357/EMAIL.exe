import crypto from 'crypto';

const AUTH_SALT = process.env.AUTH_SECRET || 'mailpilot_secure_salt_2026';

/**
 * Hash a plain-text password using PBKDF2 with SHA-512.
 */
export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, AUTH_SALT, 10000, 64, 'sha512').toString('hex');
}

/**
 * Verify a plain-text password against a stored hash using constant-time comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const computedHash = hashPassword(password);
  try {
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return computedHash === storedHash;
  }
}
