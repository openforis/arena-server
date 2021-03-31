import { BaseProtocol, DB } from '../../db'

/**
 * Returns a list of all survey ids.
 *
 * @param client - Database client.
 */
export const getAllIds = async (client: BaseProtocol<any> = DB): Promise<Array<number>> =>
  client.map<number>(`SELECT id FROM survey`, [], (result) => result.id)
