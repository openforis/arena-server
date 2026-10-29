import { UserGroup } from '@openforis/arena-core'
import { BaseProtocol, DB, DBs, TableUserGroup } from '../../db'
import { SqlUpdateBuilder } from '../../db/sql'

const dateModifiedNow = "(now() AT TIME ZONE 'UTC')"

// Full props replace.
export const update = (
  params: { uuid: string; props: UserGroup['props'] },
  client: BaseProtocol = DB
): Promise<UserGroup> => {
  const { uuid, props } = params
  const table = new TableUserGroup()

  const sql = new SqlUpdateBuilder()
    .update(table)
    .set(table.props, '$1::jsonb')
    .set(table.dateModified, dateModifiedNow)
    .where(`${table.uuid} = $2`)
    .returning(...table.summaryColumns)
    .build()

  return client.one<UserGroup>(sql, [props, uuid], (row) => DBs.transformCallback({ row }))
}

// Partial props merge.
export const updateProps = (
  params: { uuid: string; props: Partial<UserGroup['props']> },
  client: BaseProtocol = DB
): Promise<UserGroup> => {
  const { uuid, props } = params
  const table = new TableUserGroup()

  const sql = new SqlUpdateBuilder()
    .update(table)
    .set(table.props, `${table.props} || $1::jsonb`)
    .set(table.dateModified, dateModifiedNow)
    .where(`${table.uuid} = $2`)
    .returning(...table.summaryColumns)
    .build()

  return client.one<UserGroup>(sql, [props, uuid], (row) => DBs.transformCallback({ row }))
}

// Removes a (deleted) group from the readable groups of the other groups of the survey.
export const removeReadableGroupUuid = (
  params: { surveyUuid: string; groupUuid: string },
  client: BaseProtocol = DB
): Promise<null> => {
  const { surveyUuid, groupUuid } = params
  const table = new TableUserGroup()
  const readableGroupUuidsPath = `${table.props} -> 'readableGroupUuids'`

  const sql = new SqlUpdateBuilder()
    .update(table)
    .set(
      table.props,
      `jsonb_set(${table.props}, '{readableGroupUuids}', COALESCE(
        (SELECT jsonb_agg(item) FROM jsonb_array_elements(${readableGroupUuidsPath}) AS item WHERE item <> to_jsonb($1::text)),
        '[]'::jsonb
      ))`
    )
    .set(table.dateModified, dateModifiedNow)
    .where(
      `${table.surveyUuid} = $2 AND jsonb_typeof(${readableGroupUuidsPath}) = 'array' AND ${readableGroupUuidsPath} ? $1`
    )
    .build()

  return client.none(sql, [groupUuid, surveyUuid])
}
