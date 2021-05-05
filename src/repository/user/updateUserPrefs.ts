import { Objects, User } from '@openforis/arena-core'

import { BaseProtocol, DB, TableUser } from '../../db'
import { SqlUpdateBuilder } from '../../db/sql'

/**
 * Updates user prefs
 *
 * @param options - contains user to update
 * @param options.userToUpdate - user to update
 * @param client - Database client.
 */

export const updateUserPrefs = async (options: { userToUpdate: User }, client: BaseProtocol = DB): Promise<User> => {
  const { userToUpdate: user } = options
  const table = new TableUser()
  const selectFields = [table.uuid, table.name, table.email, table.prefs, table.status, table.props]

  const sql = new SqlUpdateBuilder()
    .update(table)
    .set(table.prefs, `prefs || $1::jsonb`)
    .where(`${table.uuid} = $2`)
    .returning(...selectFields)
    .build()

  return client.one(sql, [user.prefs, user.uuid], Objects.camelize)
}
