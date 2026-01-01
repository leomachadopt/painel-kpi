import type { IncomingMessage, ServerResponse } from 'http'
import { createApp } from '../server/app.js'

const app = createApp()

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Express app é um handler (req, res)
  return app(req as any, res as any)
}


