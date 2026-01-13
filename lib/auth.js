import bcrypt from 'bcryptjs';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { createToken, verifyToken } from './jwt';

// Export JWT functions for backward compatibility (Node.js usages)
export { createToken, verifyToken };

// Password hashing
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// JWT operations removed (moved to jwt.js)

// TOTP (Time-based One-Time Password) for MFA
export function generateMFASecret() {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function generateTOTP(secret, email) {
  const totp = new OTPAuth.TOTP({
    issuer: 'Pavilion Sports',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp;
}

export async function generateQRCode(secret, email) {
  const totp = generateTOTP(secret, email);
  const otpauthURL = totp.toString();
  const qrCodeDataURL = await QRCode.toDataURL(otpauthURL);
  return qrCodeDataURL;
}

export function verifyTOTP(secret, token) {
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // Allow 1 step before and after for clock skew
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

// Session management
export function generateSessionId() {
  return uuidv4();
}
