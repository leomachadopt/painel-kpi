import crypto from 'crypto'

const PREFIX = 'enc:v1:'

function getKey() {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY
  if (!raw) return null
  // Expect base64 of 32 bytes
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('INTEGRATIONS_ENCRYPTION_KEY must be base64-encoded 32 bytes')
  }
  return key
}

export function encryptIfPossible(plaintext: string | null | undefined) {
  if (!plaintext) return null
  const key = getKey()
  if (!key) return plaintext // dev fallback (not encrypted)

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptIfNeeded(value: string | null | undefined) {
  if (!value) return null
  if (!value.startsWith(PREFIX)) return value // plaintext legacy/dev
  const key = getKey()
  if (!key) {
    throw new Error('INTEGRATIONS_ENCRYPTION_KEY not configured (cannot decrypt)')
  }

  const rest = value.slice(PREFIX.length)
  const [ivB64, tagB64, dataB64] = rest.split(':')
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted payload')
  }

  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()])
  return plaintext.toString('utf8')
}





