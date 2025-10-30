import bcrypt from 'bcryptjs'
import { User, UserStatus } from '@openforis/arena-core'

import { BaseProtocol, DB, SqlSelectBuilder, TableUser } from '../../db'

type getOptionsType = { userUuid: string } | { email: string } | { email: string; password: string }

/**
 * Returns a user by id.
 *
 * @param options
 * @param client - Database client.
 */
export const get = async (options: getOptionsType, client: BaseProtocol = DB): Promise<User | null> => {
  if (!('userUuid' in options) && !('email' in options)) throw new Error(`missingParams, ${options}`)

  const table = new TableUser()
  const selectFields = [table.uuid, table.name, table.email, table.prefs, table.status, table.props]
  let filterByValue = ''
  let filterByColumn
  if ('password' in options) {
    filterByValue = options.email
    filterByColumn = table.email
    // Using email and password to fetch user
    // Do not include password by default
    selectFields.push(table.password)
  } else if ('userUuid' in options) {
    filterByValue = options.userUuid
    filterByColumn = table.uuid
  } else if ('email' in options) {
    filterByValue = options.email
    filterByColumn = table.email
  }

  const sql = new SqlSelectBuilder()
    .select(...selectFields)
    .from(table)
    .where(`${filterByColumn} = $1`)
    .build()

  const user = await client.oneOrNone<User>(sql, [filterByValue])
  if (!user) {
    return null
  }
  // Incorrect password check
  if (
    'password' in options &&
    (user.status !== UserStatus.ACCEPTED || !user.password || !bcrypt.compareSync(options.password, user.password))
  ) {
    return null
  }
  if (user.password) {
    delete user.password
  }
  return user
}
