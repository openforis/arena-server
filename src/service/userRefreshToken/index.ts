import { UserRefreshToken, UserRefreshTokenService } from '@openforis/arena-core'

import { UserRefreshTokenRepository } from '../../repository'

export const UserRefreshTokenServiceServer: UserRefreshTokenService = {
  async create(options: UserRefreshToken): Promise<UserRefreshToken> {
    const { userUuid, token, expiresAt, props } = options
    return UserRefreshTokenRepository.insert({ userUuid, token, expiresAt, props })
  },
  async getByUuid(tokenUuid: string): Promise<UserRefreshToken | null> {
    return UserRefreshTokenRepository.getByUuid(tokenUuid)
  },
  async revoke(options: { tokenUuid: string }): Promise<void> {
    const { tokenUuid } = options
    return UserRefreshTokenRepository.revoke(tokenUuid)
  },
  async revokeAll(options: { userUuid: string }): Promise<void> {
    const { userUuid } = options
    return UserRefreshTokenRepository.revokeAll({ userUuid })
  },
  async deleteExpired(): Promise<number> {
    return UserRefreshTokenRepository.deleteExpired()
  },
}
