import 'dotenv/config'
import { Server } from 'http'

import { ArenaServer } from '../../server'
import { DB } from '../db'

let server: Server

beforeAll(async () => {
  const arenaApp = await ArenaServer.init()
  server = await ArenaServer.start(arenaApp)
})

afterAll(async () => {
  await ArenaServer.stop(server)
})

describe('DBMigrator', () => {
  test('Public schema create', async () => {
    const result = await DB.one(
      `select * from pg_stat_activity where datname = 'arena'
        and query like '%select * from pg_stat_activity where datname = ''arena''%'`
    )
    await expect(result.usename).toBe('arena')
  })
})
