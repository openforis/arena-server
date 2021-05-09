import { TableAuthGroup, TableAuthGroupUser } from '../../table'
import { SqlJoinBuilder } from '../sqlJoinBuilder'

const join = 'JOIN public."auth_group" AS _ag'
const on = 'ON _ag.uuid = _agu.group_uuid'

describe('SqlJoinBuilder builds correct:', () => {
  test('join+on', async () => {
    const tableAuthGroup = new TableAuthGroup()
    const tableAuthGroupUser = new TableAuthGroupUser()

    const sql = new SqlJoinBuilder()
      .join(tableAuthGroup)
      .on(`${tableAuthGroup.uuid} = ${tableAuthGroupUser.groupUuid}`)
      .build()

    expect(sql).toBe(`${join} ${on}`)
  })
})
