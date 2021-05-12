import { NodeDef, Objects } from '@openforis/arena-core'
import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableNodeDef } from '../../db'

const dbTransformCallback = ({ row, draft, advanced = false, backup = false }: any) => {
  const rowUpdated = { ...row }
  if (advanced) {
    if (!Objects.isEmpty(row.props_advanced_draft)) {
      rowUpdated.draft_advanced = true
    }
    if (draft && !backup) {
      // merge props_advanced and props_advanced_draft into props_advanced
      rowUpdated.props_advanced = {
        ...row.props_advanced_draft,
        ...row.props_advanced,
      }
    }
    if (!backup || !draft) {
      // ignore pops_advanced_draft
      delete rowUpdated.props_advanced_draft
    }
  }
  return DBs.transformCallback({ row: rowUpdated, draft, assocPublishedDraft: true, backup })
}

/**
 * Create new nodeDef
 *
 * @param options - Contains options for query
 * @param client - Database client.
 */

export const create = async (
  options: {
    surveyId: number
    nodeDef: NodeDef<any>
  },
  client: BaseProtocol = DB
): Promise<NodeDef<any>> => {
  const { surveyId, nodeDef } = options
  const table = new TableNodeDef(surveyId)

  const columns = [
    table.parentUuid,
    table.uuid,
    table.type,
    table.propsDraft,
    table.propsAdvancedDraft,
    table.meta,
    table.analysis,
    table.virtual,
  ]

  const sql = new SqlInsertBuilder()
    .insertInto(table, ...columns)
    .values('$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8')
    .returning(...columns)
    .build()

  return client.one<NodeDef<any>>(
    sql,
    [
      nodeDef.parentUuid,
      nodeDef.uuid,
      nodeDef.type,
      nodeDef.propsDraft,
      nodeDef.propsAdvancedDraft,
      nodeDef.meta,
      nodeDef.analysis,
      nodeDef.virtual,
    ],
    (row) => dbTransformCallback({ row, advanced: true, draft: true })
  )
}
