import 'dotenv/config'

import { DB } from '../db'

describe('DBMigrator', () => {
  test('Public schema create', async () => {
    const result = await DB.one(
      `select * from pg_stat_activity where datname = 'arena'
        and query like '%select * from pg_stat_activity where datname = ''arena''%'`
    )
    await expect(result.usename).toBe('arena')
  })
})
