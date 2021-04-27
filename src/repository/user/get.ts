import bcrypt from 'bcryptjs'
import { User, UserStatus } from '@openforis/arena-core'
import { UserResetPasswordRepository } from '../../repository'

import { BaseProtocol, DB, SqlSelectBuilder, TableUser } from '../../db'
import { AuthGroupRepository } from '../authGroup/index'

const comparePassword = bcrypt.compareSync

const _initializeUser = async (user: User): Promise<User> => {
  // Assoc auth groups
  let userUpdated = {
    ...user,
    authGroups: await AuthGroupRepository.getMany({ userUuid: user.uuid }),
  }
  if (user.status === UserStatus.INVITED) {
    const expired = !(await UserResetPasswordRepository.hasValidResetPassword({ userUuid: user.uuid }))
    userUpdated = {
      ...userUpdated,
      invitation: {
        expired,
      },
    }
  }

  return userUpdated
}

/**
 * Returns a user by id.
 *
 * @param client - Database client.
 */
type getOptionsType = { userUuid: string } | { email: string } | { email: string; password: string }
export const get = async (options: getOptionsType, client: BaseProtocol = DB): Promise<User | null> => {
  if (!('userUuid' in options) && !('email' in options)) throw new Error(`missingParams, ${options}`)

  const table = new TableUser()
  const selectFields = [table.uuid, table.name, table.email, table.prefs, table.status, table.props]
  let value = ''
  let column
  if ('password' in options) {
    value = options.email
    column = table.email
    // Using email and password to fetch user
    // Do not include password by default
    selectFields.push(table.password)
  } else if ('userUuid' in options) {
    value = options.userUuid
    column = table.uuid
  } else if ('email' in options) {
    value = options.email
    column = table.email
  }

  const sql = new SqlSelectBuilder()
    .select(...selectFields)
    .from(table)
    .where(`${column} = $1`)
    .build()

  const user = await client.one<User>(sql, [value])
  // Incorrect password check
  if ('password' in options && user.password && !(await comparePassword(options.password, user.password))) return null
  if (user.password) delete user.password

  return _initializeUser(user)
}
