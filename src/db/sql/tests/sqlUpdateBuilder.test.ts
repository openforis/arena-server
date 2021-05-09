import { TableUser } from '../../table'
import { SqlUpdateBuilder } from '../sqlUpdateBuilder'

const update = 'UPDATE public."user" AS _u'
const set = 'SET prefs = _u.prefs || $1::jsonb'
const where = 'WHERE _u.uuid = $2'
const returning = 'RETURNING _u.uuid, _u.name, _u.email, _u.prefs, _u.status, _u.props'

describe('SqlUpdateBuilder builds correct:', () => {
  test('update+set', async () => {
    const table = new TableUser()

    const sql = new SqlUpdateBuilder().update(table).set(table.prefs, `${table.prefs} || $1::jsonb`).build()

    expect(sql).toBe(`${update} ${set}`)
  })

  test('update+set+where', async () => {
    const table = new TableUser()

    const sql = new SqlUpdateBuilder()
      .update(table)
      .set(table.prefs, `${table.prefs} || $1::jsonb`)
      .where(`${table.uuid} = $2`)
      .build()

    expect(sql).toBe(`${update} ${set} ${where}`)
  })

  test('update+set+where+returning', async () => {
    const table = new TableUser()
    const selectFields = [table.uuid, table.name, table.email, table.prefs, table.status, table.props]

    const sql = new SqlUpdateBuilder()
      .update(table)
      .set(table.prefs, `${table.prefs} || $1::jsonb`)
      .where(`${table.uuid} = $2`)
      .returning(...selectFields)
      .build()

    expect(sql).toBe(`${update} ${set} ${where} ${returning}`)
  })
})
