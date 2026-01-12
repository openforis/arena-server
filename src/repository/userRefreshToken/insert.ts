import { UserAuthRefreshToken } from '@openforis/arena-core'
import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableUserRefreshToken } from '../../db'

/**
 * Inserts a new refresh token for a user.
 *
 * @param options - The refresh token data
 * @param client - Database client
 */
export const insert = async (
  options: UserAuthRefreshToken,
  client: BaseProtocol = DB
): Promise<UserAuthRefreshToken> => {
  const { uuid, userUuid, dateCreated, expiresAt, props = {}, token } = options

  const table = new TableUserRefreshToken()

  const values = {
    [table.uuid.columnName]: uuid,
    [table.userUuid.columnName]: userUuid,
    [table.dateCreated.columnName]: dateCreated,
    [table.expiresAt.columnName]: expiresAt,
    [table.props.columnName]: props,
  }

  const sql = new SqlInsertBuilder()
    .insertInto(table)
    .valuesByColumn(values)
    .returning(...table.columns)
    .build()

  const insertedObject = await client.one<UserAuthRefreshToken>(sql, values, (row) => DBs.transformCallback({ row }))
  // table does not include token column, so we need to add it manually
  return { ...insertedObject, token }
}
