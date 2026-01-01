import crypto from 'crypto'

export type AuthTokenPayload = {
  sub: string
  role: 'MENTORA' | 'GESTOR_CLINICA'
  clinicId?: string | null
  iat: number
  exp: number
}

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64urlToBuffer(input: string) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad
  return Buffer.from(b64, 'base64')
}

function getSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET
  if (secret) return secret

  // Dev fallback: generate an in-memory secret so local login works without env setup.
  // IMPORTANT: sessions will be invalidated on server restart. In production, set AUTH_TOKEN_SECRET.
  const g = globalThis as any
  if (!g.__AUTH_TOKEN_SECRET_FALLBACK) {
    g.__AUTH_TOKEN_SECRET_FALLBACK = crypto.randomBytes(32).toString('hex')
    console.warn(
      '🟠 AUTH_TOKEN_SECRET not configured. Using a random in-memory secret (sessions will reset on restart).'
    )
  }
  return g.__AUTH_TOKEN_SECRET_FALLBACK as string
}

export function signAuthToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>, ttlSeconds = 60 * 60 * 24 * 7) {
  const now = Math.floor(Date.now() / 1000)
  const full: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  }

  const data = base64url(JSON.stringify(full))
  const sig = crypto.createHmac('sha256', getSecret()).update(data).digest()
  return `${data}.${base64url(sig)}`
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [data, sig] = parts

  const expected = crypto.createHmac('sha256', getSecret()).update(data).digest()
  const given = base64urlToBuffer(sig)
  if (given.length !== expected.length) return null
  if (!crypto.timingSafeEqual(given, expected)) return null

  try {
    const payload = JSON.parse(base64urlToBuffer(data).toString('utf8')) as AuthTokenPayload
    const now = Math.floor(Date.now() / 1000)
    if (!payload.exp || payload.exp < now) return null
    return payload
  } catch {
    return null
  }
}


