import { TableActivityLog } from '../../table'
import { SqlInsertBuilder } from '../sqlInsertBuilder'

const insert = 'INSERT INTO survey_1."activity_log" AS _al (_al.type, _al.user_uuid, _al.content, _al.system)'
const into = 'VALUES ($1, $2, $3::jsonb, $4)'

describe('SqlInsertBuilder builds correct:', () => {
  test('insert+into', async () => {
    const table = new TableActivityLog(1)

    const sql = new SqlInsertBuilder()
      .insertInto(table, table.type, table.userUuid, table.content, table.system)
      .values('$1', '$2', '$3::jsonb', '$4')
      .build()

    expect(sql).toBe(`${insert} ${into}`)
  })
})

describe('SqlInsertBuilder fails on missing params:', () => {
  test('columns', async () => {
    const table = new TableActivityLog(1)

    const sql = new SqlInsertBuilder().insertInto(table).values('$1', '$2', '$3::jsonb', '$4')

    expect(() => {
      sql.build()
    }).toThrow()
  })

  test('table', async () => {
    const table = new TableActivityLog(1)

    const sql = new SqlInsertBuilder()
      // @ts-ignore
      .insertInto(null, table.type, table.userUuid, table.content, table.system)
      .values('$1', '$2', '$3::jsonb', '$4')

    expect(() => {
      sql.build()
    }).toThrow()
  })

  test('values', async () => {
    const table = new TableActivityLog(1)

    const sql = new SqlInsertBuilder()
      .insertInto(table, table.type, table.userUuid, table.content, table.system)
      .values()

    expect(() => {
      sql.build()
    }).toThrow()
  })
})

describe('SqlInsertBuilder throws on incorrect params sum:', () => {
  test('too many values', async () => {
    const table = new TableActivityLog(1)

    const sql = new SqlInsertBuilder()
      .insertInto(table, table.type, table.userUuid, table.content)
      .values('$1', '$2', '$3::jsonb', '$4')

    expect(() => {
      sql.build()
    }).toThrow()
  })

  test('too many columns', async () => {
    const table = new TableActivityLog(1)

    const sql = new SqlInsertBuilder()
      .insertInto(table, table.type, table.userUuid, table.content, table.system)
      .values('$1', '$2', '$3::jsonb')

    expect(() => {
      sql.build()
    }).toThrow()
  })
})
