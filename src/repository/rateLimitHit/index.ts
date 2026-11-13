import { decrement } from './decrement'
import { deleteExpired } from './deleteExpired'
import { increment } from './increment'
import { resetKey } from './resetKey'

export const RateLimitHitRepository = {
  increment,
  decrement,
  resetKey,
  deleteExpired,
}
