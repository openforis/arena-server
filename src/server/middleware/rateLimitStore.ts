import { ClientRateLimitInfo, Options, Store } from 'express-rate-limit'

import { RateLimitHitRepository } from '../../repository'

/**
 * express-rate-limit store shared by all the server instances (the default MemoryStore counts per process).
 */
export class PgRateLimitStore implements Store {
  readonly prefix: string
  readonly localKeys = false
  private windowMs = 0

  constructor(prefix: string) {
    this.prefix = prefix
  }

  init(options: Options): void {
    this.windowMs = options.windowMs
  }

  increment(key: string): Promise<ClientRateLimitInfo> {
    return RateLimitHitRepository.increment({ key: this.prefix + key, windowMs: this.windowMs })
  }

  decrement(key: string): Promise<void> {
    return RateLimitHitRepository.decrement(this.prefix + key)
  }

  resetKey(key: string): Promise<void> {
    return RateLimitHitRepository.resetKey(this.prefix + key)
  }
}
