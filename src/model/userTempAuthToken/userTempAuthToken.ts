export type UserTempAuthToken = {
  tokenHash: string
  userUuid: string
  dateCreated: Date
  dateExpiresAt: Date
}

export type CreatedTempAuthToken = UserTempAuthToken & {
  token: string // Plain token returned only once to the client
}
