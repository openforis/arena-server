import { BaseProtocol, DB, DBs } from '../../db'
import { AuthProviderProps, AuthProviderType } from '../../model'

/**
 * Provider row as stored: the client secret is still encrypted.
 */
export interface AuthProviderRow {
  id: string
  type: AuthProviderType
  props: AuthProviderProps
  clientSecret: string | null
  iconMime: string | null
  dateCreated: Date
  dateModified: Date
}

const selectFields = `id, type, props, client_secret, icon_mime, date_created, date_modified`

const transform = (row: any): AuthProviderRow => DBs.transformCallback({ row })

const getAll = (client: BaseProtocol = DB): Promise<AuthProviderRow[]> =>
  client.map(`SELECT ${selectFields} FROM auth_provider ORDER BY (props->>'order')::int NULLS LAST, id`, [], transform)

const getById = (id: string, client: BaseProtocol = DB): Promise<AuthProviderRow | null> =>
  client.oneOrNone(`SELECT ${selectFields} FROM auth_provider WHERE id = $1`, [id], transform)

const insert = (
  params: { id: string; type: AuthProviderType; props: AuthProviderProps; clientSecret?: string | null },
  client: BaseProtocol = DB
): Promise<AuthProviderRow> => {
  const { id, type, props, clientSecret = null } = params
  return client.one(
    `INSERT INTO auth_provider (id, type, props, client_secret)
     VALUES ($/id/, $/type/, $/props/::jsonb, $/clientSecret/)
     RETURNING ${selectFields}`,
    { id, type, props: JSON.stringify(props), clientSecret },
    transform
  )
}

/**
 * Updates the props and, when clientSecret is defined, the encrypted client secret.
 */
const update = (
  params: { id: string; props: AuthProviderProps; clientSecret?: string },
  client: BaseProtocol = DB
): Promise<AuthProviderRow | null> => {
  const { id, props, clientSecret } = params
  const secretSet = clientSecret === undefined ? '' : ', client_secret = $/clientSecret/'
  return client.oneOrNone(
    `UPDATE auth_provider
     SET props = $/props/::jsonb, date_modified = (now() AT TIME ZONE 'UTC')${secretSet}
     WHERE id = $/id/
     RETURNING ${selectFields}`,
    { id, props: JSON.stringify(props), clientSecret },
    transform
  )
}

const updateOrders = async (orderById: Record<string, number>, client: BaseProtocol = DB): Promise<void> => {
  await client.tx(async (tx) => {
    for (const [id, order] of Object.entries(orderById)) {
      await tx.none(
        `UPDATE auth_provider SET props = jsonb_set(props, '{order}', to_jsonb($/order/::int)) WHERE id = $/id/`,
        { id, order }
      )
    }
  })
}

const setIcon = async (
  params: { id: string; file: Buffer | null; mime: string | null },
  client: BaseProtocol = DB
): Promise<void> => {
  const { id, file, mime } = params
  await client.none(
    `UPDATE auth_provider
     SET icon_file = $/file/, icon_mime = $/mime/, date_modified = (now() AT TIME ZONE 'UTC')
     WHERE id = $/id/`,
    { id, file, mime }
  )
}

const getIcon = (id: string, client: BaseProtocol = DB): Promise<{ file: Buffer; mime: string } | null> =>
  client.oneOrNone(
    `SELECT icon_file AS file, icon_mime AS mime FROM auth_provider WHERE id = $1 AND icon_file IS NOT NULL`,
    [id]
  )

const deleteById = (id: string, client: BaseProtocol = DB): Promise<boolean> =>
  client.result(`DELETE FROM auth_provider WHERE id = $1`, [id], (result) => result.rowCount > 0)

export const AuthProviderRepository = {
  getAll,
  getById,
  insert,
  update,
  updateOrders,
  setIcon,
  getIcon,
  deleteById,
}
