import { DB } from '../../db'
import { DBMigrator } from '../../db/dbMigrator'
import { ClusterBus } from '../clusterBus'
import { runWithClusterLock } from '../clusterLock'
import { ClusterEvent } from '../types'

let received: ClusterEvent[] = []

const waitFor = async (predicate: () => boolean, timeoutMs = 2000): Promise<void> => {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for cluster event')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

// Top-level (not per-describe) hooks: ClusterBus/DB are file-wide singletons, so init and
// pool teardown must each run exactly once for the whole file, regardless of how many
// describe blocks use them.
beforeAll(async () => {
  await DBMigrator.migrateSchema()
  await ClusterBus.init()
  // A single handler collecting every event: ClusterBus.onEvent has no matching "off", so
  // registering per-test would leak handlers across tests within this file.
  ClusterBus.onEvent((event) => received.push(event))
})

afterEach(() => {
  received = []
})

afterAll(async () => {
  await ClusterBus.shutdown()
  await DB.$pool.end()
})

describe('ClusterBus', () => {
  test('publish delivers an inline event back to this dyno through its own listener', async () => {
    await ClusterBus.publish({ targetType: 'test', targetId: 'inline-1', eventType: 'ping', message: { n: 1 } })

    await waitFor(() => received.length === 1)
    expect(received[0]).toEqual({ targetType: 'test', targetId: 'inline-1', eventType: 'ping', message: { n: 1 } })
  })

  test('publish spills oversized payloads through ws_relay_message and still delivers them', async () => {
    const bigMessage = { blob: 'x'.repeat(8000) }

    await ClusterBus.publish({ targetType: 'test', targetId: 'big-1', eventType: 'ping-big', message: bigMessage })

    await waitFor(() => received.length === 1)
    expect(received[0].message).toEqual(bigMessage)
  })

  test('publish never throws, even if the event cannot be delivered', async () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular // not JSON-serializable

    await expect(
      ClusterBus.publish({ targetType: 'test', targetId: 'bad-1', eventType: 'ping', message: circular })
    ).resolves.toBeUndefined()
  })
})

describe('runWithClusterLock', () => {
  test('only one of two concurrent callers runs, and the lock is released afterwards', async () => {
    const lockName = `test-lock-${Date.now()}`
    let runs = 0
    const runFn = async (): Promise<void> => {
      runs++
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    const [a, b] = await Promise.all([
      runWithClusterLock({ lockName, fn: runFn }),
      runWithClusterLock({ lockName, fn: runFn }),
    ])

    expect([a, b].filter(Boolean)).toHaveLength(1)
    expect(runs).toBe(1)

    // the lock was released after the first run completed, so a later caller can acquire it
    const c = await runWithClusterLock({ lockName, fn: runFn })
    expect(c).toBe(true)
    expect(runs).toBe(2)
  })
})
