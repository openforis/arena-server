import { DB } from '../../../db'
import { DBMigrator } from '../../../db/dbMigrator'
import { RateLimitHitRepository } from '../index'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('RateLimitHitRepository', () => {
  beforeAll(async () => {
    await DBMigrator.migrateSchema()
  })

  afterAll(async () => {
    await DB.$pool.end()
  })

  test('increment counts hits within the window', async () => {
    const key = `test-count-${Date.now()}`

    const first = await RateLimitHitRepository.increment({ key, windowMs: 60_000 })
    const second = await RateLimitHitRepository.increment({ key, windowMs: 60_000 })

    expect(first.totalHits).toBe(1)
    expect(second.totalHits).toBe(2)
    expect(second.resetTime.getTime()).toBe(first.resetTime.getTime())
    expect(first.resetTime.getTime()).toBeGreaterThan(Date.now())
  })

  test('increment starts a new window once the previous one has expired', async () => {
    const key = `test-window-${Date.now()}`

    await RateLimitHitRepository.increment({ key, windowMs: 100 })
    await RateLimitHitRepository.increment({ key, windowMs: 100 })
    await sleep(200)

    const { totalHits } = await RateLimitHitRepository.increment({ key, windowMs: 100 })
    expect(totalHits).toBe(1)
  })

  test('decrement and resetKey', async () => {
    const key = `test-reset-${Date.now()}`

    await RateLimitHitRepository.increment({ key, windowMs: 60_000 })
    await RateLimitHitRepository.increment({ key, windowMs: 60_000 })
    await RateLimitHitRepository.decrement(key)
    expect((await RateLimitHitRepository.increment({ key, windowMs: 60_000 })).totalHits).toBe(2)

    await RateLimitHitRepository.resetKey(key)
    expect((await RateLimitHitRepository.increment({ key, windowMs: 60_000 })).totalHits).toBe(1)
  })

  test('deleteExpired removes only expired rows', async () => {
    const expiredKey = `test-expired-${Date.now()}`
    const activeKey = `test-active-${Date.now()}`
    await RateLimitHitRepository.increment({ key: expiredKey, windowMs: 1 })
    await RateLimitHitRepository.increment({ key: activeKey, windowMs: 60_000 })
    await sleep(50)

    await RateLimitHitRepository.deleteExpired()

    const keys = await DB.map(
      'SELECT key FROM rate_limit_hit WHERE key IN ($1, $2)',
      [expiredKey, activeKey],
      (r) => r.key
    )
    expect(keys).toEqual([activeKey])
  })
})
