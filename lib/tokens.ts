import { randomBytes } from 'crypto';

/** URL-safe random token, used for invitations and password reset links. */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}
