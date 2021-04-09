export enum ServerErrorCode {
  CONTINUE = 100,

  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,

  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,

  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

export class ServerError extends Error {
  key: string
  params: any
  statusCode: ServerErrorCode

  constructor(key: string, params?: any, statusCode: ServerErrorCode = ServerErrorCode.INTERNAL_SERVER_ERROR) {
    super(key)
    this.name = 'ServerError'
    this.key = key
    this.params = params
    this.statusCode = statusCode

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServerError)
    }
  }
}

export class UnauthorizedError extends ServerError {
  constructor(userName: string) {
    super('appErrors.userNotAuthorized', { userName })
    this.name = 'UnauthorizedError'
  }
}
