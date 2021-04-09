import { Request } from 'express'

const getHost = (request: Request): string | undefined => request.header('host')
const getServerUrl = (request: Request): string => `${request.protocol}://${request.get('host')}`
const getUrl = (request: Request): string => request.url
const isHttps = (request: Request): boolean => request.secure || request.header('x-forwarded-proto') === 'https'

export const Requests = {
  getHost,
  getServerUrl,
  getUrl,
  isHttps,
}
