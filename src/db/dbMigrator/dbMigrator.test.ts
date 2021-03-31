import 'dotenv/config'

import { DBMigrator } from './dbMigrator'
import { DB } from '../db'

beforeAll(async () => {
  await DBMigrator.migrateAll()
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
