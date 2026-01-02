import type { Request, Response, NextFunction } from 'express'
import { verifyAuthToken, type AuthTokenPayload } from '../auth/token.js'

export type AuthedRequest = Request & { auth?: AuthTokenPayload }

export function authOptional(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim()
    const payload = verifyAuthToken(token)
    if (payload) req.auth = payload
  }
  next()
}

export function authRequired(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' })
  }
  const token = header.slice('Bearer '.length).trim()
  const payload = verifyAuthToken(token)
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  req.auth = payload
  next()
}



