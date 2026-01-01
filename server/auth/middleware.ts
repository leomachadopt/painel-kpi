import { Request, Response, NextFunction } from 'express'
import { verifyAuthToken, AuthTokenPayload } from './token.js'

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.substring(7) // Remove 'Bearer '
  const payload = verifyAuthToken(token)

  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = payload
  next()
}
