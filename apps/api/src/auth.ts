import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type AuthUser = { userId: string };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth;
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'SERVER_MISCONFIGURED' });
    const decoded = jwt.verify(token, secret) as AuthUser;
    (req as any).auth = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

export function getAuth(req: Request): AuthUser {
  return (req as any).auth as AuthUser;
}


