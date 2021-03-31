import 'dotenv/config'

import { ArenaServer } from '../../arenaServer'
import { DB } from '../db'

beforeAll(async () => {
  await ArenaServer.init()
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
