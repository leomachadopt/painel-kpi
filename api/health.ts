import type { IncomingMessage, ServerResponse } from 'http'

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Vercel serverless function is working',
    node_version: process.version,
    env: process.env.NODE_ENV || 'unknown'
  }))
}
