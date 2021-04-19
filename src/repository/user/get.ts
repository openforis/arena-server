import { BaseProtocol, DB, SqlSelectBuilder, TableUser } from '../../db'
import { User } from '@openforis/arena-core'

/**
 * Returns a user by id.
 *
 * @param client - Database client.
 */
type getOptionsType = { userUuid: string } | { email: string }
export const get = async (options: getOptionsType, client: BaseProtocol = DB): Promise<User> => {
  if (!('userUuid' in options) && !('email' in options)) throw new Error(`missingParams, ${options}`)

  const table = new TableUser()
  const selectFields = [table.uuid, table.name, table.email, table.prefs, table.status, table.props]
  let where = ''

  if ('email' in options) {
    where = `table.email = '${options.email}'`
    // Using email and password to fetch user
    // Do not include password by default
    selectFields.push(table.password)
  } else {
    where = `table.uuid = '${options.userUuid}'`
  }

  const sql = new SqlSelectBuilder()
    .select(...selectFields)
    .from(table)
    .where(where)
    .build()

  return client.one<User>(sql)
}
