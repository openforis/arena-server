import { Express } from 'express'

export interface ExpressInitializer<T = void> {
  init: (express: Express) => T
}
