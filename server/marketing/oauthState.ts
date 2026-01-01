type OAuthProvider = 'META' | 'GOOGLE'

export type OAuthStatePayload = {
  provider: OAuthProvider
  clinicId: string
  returnTo: string
  createdAt: number
}

const STATE_TTL_MS = 10 * 60 * 1000
const stateStore = new Map<string, OAuthStatePayload>()

function randomState() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export function createOAuthState(payload: Omit<OAuthStatePayload, 'createdAt'>) {
  const state = randomState()
  stateStore.set(state, { ...payload, createdAt: Date.now() })
  return state
}

export function consumeOAuthState(state: string) {
  const entry = stateStore.get(state)
  stateStore.delete(state)
  if (!entry) return null
  if (Date.now() - entry.createdAt > STATE_TTL_MS) return null
  return entry
}


