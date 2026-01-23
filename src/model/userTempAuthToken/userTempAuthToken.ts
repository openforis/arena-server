export type UserTempAuthToken = {
  userUuid: string
  dateCreated: Date
  dateExpiresAt: Date
}

export type UserTempAuthTokenStored = UserTempAuthToken & {
  tokenHash: string
}

export type UserTempAuthTokenForClient = UserTempAuthToken & {
  token: string // Plain token returned only once to the client
}
