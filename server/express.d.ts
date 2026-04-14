import 'express';
import type { AuthTokenPayload } from './auth/token.js';

declare module 'express' {
  export interface Request {
    auth?: AuthTokenPayload;
    user?: AuthTokenPayload;
  }
}
