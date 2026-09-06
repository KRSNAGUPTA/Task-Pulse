import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface PayLoad {
  userId: string;
  email: string; 
}

export function generateToken(
  payload: PayLoad,
  expiresIn: SignOptions['expiresIn'] = '1d'
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): PayLoad {
  return jwt.verify(token, JWT_SECRET) as PayLoad;
}