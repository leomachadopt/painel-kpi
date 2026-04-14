import type { Request, Response, NextFunction } from 'express'
import { verifyAuthToken, type AuthTokenPayload } from '../auth/token.js'
import '../express.d.ts'

// Use Request directly - it's already extended by express.d.ts
export type AuthedRequest = Request

export function authOptional(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim()
    const payload = verifyAuthToken(token)
    if (payload) {
      req.auth = payload
      req.user = payload
    }
  }
  next()
}

export function authRequired(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' })
    return
  }
  const token = header.slice('Bearer '.length).trim()
  const payload = verifyAuthToken(token)
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }
  req.auth = payload
  req.user = payload
  next()
}












