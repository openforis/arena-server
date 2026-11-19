import { ArenaService, ArenaUserGroup, ArenaUserGroupProps } from '@openforis/arena-core'
import { BaseProtocol, DB } from '../../db'
import { UserGroupMember, UserGroupRepository } from '../../repository/userGroup'

const {
  count,
  getAll,
  getByUuid,
  getManyByUser,
  insert,
  update,
  updateProps,
  removeReadableGroupUuid,
  deleteItem: deleteItemRepository,
  addMember,
  removeMember,
  getMembers,
} = UserGroupRepository

// the deleted group is also removed from the readable groups of the other groups of the survey
const deleteItem = (params: { uuid: string }, client: BaseProtocol = DB): Promise<ArenaUserGroup | null> =>
  client.tx(async (t) => {
    const deleted = await deleteItemRepository(params, t)
    if (deleted?.surveyUuid) {
      await removeReadableGroupUuid({ surveyUuid: deleted.surveyUuid, groupUuid: params.uuid }, t)
    }
    return deleted
  })

export interface UserGroupService extends ArenaService {
  count(params: { surveyUuid: string }, client?: BaseProtocol): Promise<number>
  getAll(params: { surveyUuid: string }, client?: BaseProtocol): Promise<ArenaUserGroup[]>
  getByUuid(params: { uuid: string }, client?: BaseProtocol): Promise<ArenaUserGroup | null>
  getManyByUser(params: { userUuid: string; surveyUuid?: string }, client?: BaseProtocol): Promise<ArenaUserGroup[]>
  insert(params: { surveyUuid: string; item: Partial<ArenaUserGroup> }, client?: BaseProtocol): Promise<ArenaUserGroup>
  update(params: { uuid: string; props: ArenaUserGroupProps }, client?: BaseProtocol): Promise<ArenaUserGroup>
  updateProps(
    params: { uuid: string; props: Partial<ArenaUserGroupProps> },
    client?: BaseProtocol
  ): Promise<ArenaUserGroup>
  deleteItem(params: { uuid: string }, client?: BaseProtocol): Promise<ArenaUserGroup | null>
  addMember(params: { groupUuid: string; userUuid: string }, client?: BaseProtocol): Promise<null>
  removeMember(params: { groupUuid: string; userUuid: string }, client?: BaseProtocol): Promise<null>
  getMembers(params: { groupUuid: string }, client?: BaseProtocol): Promise<UserGroupMember[]>
}

export const UserGroupServiceServer: UserGroupService = {
  count,
  getAll,
  getByUuid,
  getManyByUser,
  insert,
  update,
  updateProps,
  deleteItem,
  addMember,
  removeMember,
  getMembers,
}
