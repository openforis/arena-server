import { ArenaService, UserGroup, UserGroupProps } from '@openforis/arena-core'
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
const deleteItem = (params: { uuid: string }, client: BaseProtocol = DB): Promise<UserGroup | null> =>
  client.tx(async (t) => {
    const deleted = await deleteItemRepository(params, t)
    if (deleted?.surveyUuid) {
      await removeReadableGroupUuid({ surveyUuid: deleted.surveyUuid, groupUuid: params.uuid }, t)
    }
    return deleted
  })

export interface UserGroupService extends ArenaService {
  count(params: { surveyUuid: string }, client?: BaseProtocol): Promise<number>
  getAll(params: { surveyUuid: string }, client?: BaseProtocol): Promise<UserGroup[]>
  getByUuid(params: { uuid: string }, client?: BaseProtocol): Promise<UserGroup | null>
  getManyByUser(params: { userUuid: string; surveyUuid?: string }, client?: BaseProtocol): Promise<UserGroup[]>
  insert(params: { surveyUuid: string; item: Partial<UserGroup> }, client?: BaseProtocol): Promise<UserGroup>
  update(params: { uuid: string; props: UserGroupProps }, client?: BaseProtocol): Promise<UserGroup>
  updateProps(params: { uuid: string; props: Partial<UserGroupProps> }, client?: BaseProtocol): Promise<UserGroup>
  deleteItem(params: { uuid: string }, client?: BaseProtocol): Promise<UserGroup | null>
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
