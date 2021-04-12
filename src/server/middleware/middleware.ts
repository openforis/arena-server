import { Express } from 'express'

export interface Middleware<T = void> {
  init: (app: Express) => T
}
