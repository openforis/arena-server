import { DB } from '../db'
import { Logger } from '../log'

const logger: Logger = new Logger('ClusterLock')

/**
 * Runs `fn` while holding a cluster-wide Postgres advisory lock named `lockName`.
 * Non-blocking: if another dyno already holds the lock, `fn` is skipped and `false` is returned.
 * The lock is session-scoped, acquired and released on the same pooled connection via `DB.task`,
 * so it is always released even if `fn` throws.
 *
 * @param params - Lock name and the function to run while holding it
 */
export const runWithClusterLock = async (params: { lockName: string; fn: () => Promise<void> }): Promise<boolean> => {
  const { lockName, fn } = params

  return DB.task(async (task) => {
    const { locked } = await task.one<{ locked: boolean }>('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [
      lockName,
    ])
    if (!locked) return false

    try {
      await fn()
      return true
    } catch (error) {
      logger.error(`error running task under cluster lock "${lockName}": ${error}`)
      throw error
    } finally {
      await task.one('SELECT pg_advisory_unlock(hashtext($1))', [lockName])
    }
  })
}
