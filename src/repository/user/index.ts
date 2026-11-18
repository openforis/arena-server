import { get } from './get'
import { updateUserPrefs } from './updateUserPrefs'
import {
  acceptInvitationExternal,
  findByNormalizedEmail,
  getForExternalLogin,
  getInvitedUserUuidByResetPasswordUuid,
  normalizeEmail,
} from './externalLogin'

export type { UserForExternalLogin } from './externalLogin'

export const UserRepository = {
  get,
  updateUserPrefs,
  acceptInvitationExternal,
  findByNormalizedEmail,
  getForExternalLogin,
  getInvitedUserUuidByResetPasswordUuid,
  normalizeEmail,
}
