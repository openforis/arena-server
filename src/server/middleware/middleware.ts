import { Express } from 'express'

export interface Middleware {
  init: (app: Express) => void
}
