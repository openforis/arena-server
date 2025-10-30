export type JwtPayload = {
  userUuid: string
  uuid?: string
  exp: number
  iat: number
}
