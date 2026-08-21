import { DB } from '../../../db'
import { WsRelayMessageRepository } from '../index'

describe('WsRelayMessageRepository', () => {
  afterAll(async () => {
    await DB.$pool.end()
  })

  test('insert + getById roundtrip the payload', async () => {
    const payload = { hello: 'world', count: 3 }

    const id = await WsRelayMessageRepository.insert(payload)

    await expect(WsRelayMessageRepository.getById(id)).resolves.toEqual(payload)
  })

  test('getById returns null for an unknown id', async () => {
    await expect(WsRelayMessageRepository.getById('00000000-0000-0000-0000-000000000000')).resolves.toBeNull()
  })

  test('deleteExpired prunes rows past the TTL and leaves fresh ones alone', async () => {
    const staleId = await WsRelayMessageRepository.insert({ stale: true })
    const freshId = await WsRelayMessageRepository.insert({ stale: false })
    await DB.none(`UPDATE ws_relay_message SET date_created = now() - interval '1 day' WHERE id = $1`, [staleId])

    const deletedCount = await WsRelayMessageRepository.deleteExpired(60 * 60_000) // 1 hour TTL

    expect(deletedCount).toBeGreaterThanOrEqual(1)
    await expect(WsRelayMessageRepository.getById(staleId)).resolves.toBeNull()
    await expect(WsRelayMessageRepository.getById(freshId)).resolves.toEqual({ stale: false })
  })
})
