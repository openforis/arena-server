import { BaseProtocol, DB, SqlSelectBuilder, TableUser } from '../../db'
import { User } from '@openforis/arena-core'

/**
 * Returns a user by id.
 *
 * @param client - Database client.
 */
export const get = async (options: { userUuid: string }, client: BaseProtocol = DB): Promise<User> => {
  const { userUuid } = options
  if (!userUuid /* && !userEmail */) throw new Error(`missingParams, ${options}`)

  const table = new TableUser()
  const selectFields = [table.uuid, table.name, table.email, table.prefs, table.status, table.props]

  // TODO: Support fetching by email [and password]
  // // Using email and password to fetch user
  // // Do not include password by default
  // if (!userUuid) selectFields.push(password)

  const where = `table.uuid = '${userUuid}'`
  const sql = new SqlSelectBuilder()
    .select(...selectFields)
    .from(table)
    .where(where)
    .build()

  return client.one<User>(sql, [], (result) => result.id)
}
