import { insert } from './insert'
import { count, getAll, getByUuid } from './read'
import { update, updateProps } from './update'
import { deleteItem } from './delete'
import { getManyByUser } from './getUserGroupsByUser'
import { addMember, removeMember, getMembers } from './members'

export const UserGroupRepository = {
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

export type { UserGroup, UserGroupProps, UserGroupQualifier } from './types'
export type { UserGroupMember } from './members'
