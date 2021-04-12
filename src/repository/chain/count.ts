import { ChainProps } from '@openforis/arena-core'
import { DB, SqlSelectBuilder, TableChain } from '../../db'

//TODO: I will add this later to '@openforis/arena-core'.Objects
const propertyOf = <T>(name: keyof T): keyof T => name

export const count = (options: { cycle: string; surveyId: number }, client = DB): Promise<number> => {
  const { cycle, surveyId } = options

  const table = new TableChain(surveyId)
  const sql = new SqlSelectBuilder()
    .select(`count(${table.alias}.*)`)
    .from(table)
    .where(`(${table.props})->'${propertyOf<ChainProps>('cycles')}' @> '"${cycle}"'`)
    .build()

  return client.one<number>(sql, [], (res) => res.count)
}
