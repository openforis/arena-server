import { UUIDs } from '@openforis/arena-core'

import { DB } from '../../../db'
import { ConnectedSocketRepository } from '../index'
import { deleteTestUser, insertTestUser } from './testUtils'

describe('ConnectedSocketRepository', () => {
  let userUuid: string

  beforeAll(async () => {
    userUuid = await insertTestUser()
  })

  afterAll(async () => {
    await deleteTestUser(userUuid)
    await DB.$pool.end()
  })

  test('upsert makes the socket visible to exists', async () => {
    const socketId = UUIDs.v4()

    await ConnectedSocketRepository.upsert({ socketId, userUuid })

    await expect(ConnectedSocketRepository.exists(socketId)).resolves.toBe(true)

    await ConnectedSocketRepository.remove(socketId)
  })

  test('exists returns false for a socket that was never connected', async () => {
    await expect(ConnectedSocketRepository.exists(UUIDs.v4())).resolves.toBe(false)
  })

  test('upsert does not duplicate the row on conflict', async () => {
    const socketId = UUIDs.v4()

    await ConnectedSocketRepository.upsert({ socketId, userUuid })
    await ConnectedSocketRepository.upsert({ socketId, userUuid })

    const rows = await DB.manyOrNone(`SELECT 1 FROM connected_socket WHERE socket_id = $1`, [socketId])
    expect(rows).toHaveLength(1)

    await ConnectedSocketRepository.remove(socketId)
  })

  test('remove deletes the row', async () => {
    const socketId = UUIDs.v4()
    await ConnectedSocketRepository.upsert({ socketId, userUuid })

    await ConnectedSocketRepository.remove(socketId)

    await expect(ConnectedSocketRepository.exists(socketId)).resolves.toBe(false)
  })

  test('removeMany deletes every listed socket, and a no-op on an empty list', async () => {
    const socketIds = [UUIDs.v4(), UUIDs.v4()]
    await Promise.all(socketIds.map((socketId) => ConnectedSocketRepository.upsert({ socketId, userUuid })))

    await expect(ConnectedSocketRepository.removeMany([])).resolves.toBeUndefined()
    await ConnectedSocketRepository.removeMany(socketIds)

    for (const socketId of socketIds) {
      await expect(ConnectedSocketRepository.exists(socketId)).resolves.toBe(false)
    }
  })

  test('touchMany refreshes last_seen_at', async () => {
    const socketId = UUIDs.v4()
    await ConnectedSocketRepository.upsert({ socketId, userUuid })
    await DB.none(`UPDATE connected_socket SET last_seen_at = now() - interval '1 hour' WHERE socket_id = $1`, [
      socketId,
    ])
    const before = await DB.one<{ last_seen_at: Date }>(
      `SELECT last_seen_at FROM connected_socket WHERE socket_id = $1`,
      [socketId]
    )

    await ConnectedSocketRepository.touchMany([socketId])

    const after = await DB.one<{ last_seen_at: Date }>(
      `SELECT last_seen_at FROM connected_socket WHERE socket_id = $1`,
      [socketId]
    )
    expect(new Date(after.last_seen_at).getTime()).toBeGreaterThan(new Date(before.last_seen_at).getTime())

    await ConnectedSocketRepository.remove(socketId)
  })

  test('deleteStale prunes rows past the TTL and leaves fresh ones alone', async () => {
    const staleSocketId = UUIDs.v4()
    const freshSocketId = UUIDs.v4()
    await ConnectedSocketRepository.upsert({ socketId: staleSocketId, userUuid })
    await ConnectedSocketRepository.upsert({ socketId: freshSocketId, userUuid })
    await DB.none(`UPDATE connected_socket SET last_seen_at = now() - interval '1 hour' WHERE socket_id = $1`, [
      staleSocketId,
    ])

    const deletedCount = await ConnectedSocketRepository.deleteStale(60_000) // 1 minute TTL

    expect(deletedCount).toBeGreaterThanOrEqual(1)
    await expect(ConnectedSocketRepository.exists(staleSocketId)).resolves.toBe(false)
    await expect(ConnectedSocketRepository.exists(freshSocketId)).resolves.toBe(true)

    await ConnectedSocketRepository.remove(freshSocketId)
  })
})
