import { Response } from 'express'
import { ServerErrorCode, UnauthorizedError } from '../server/error'

enum Status {
  ok = 'ok',
  error = 'error',
}

const getError = ({ key, params }: { key: string; params?: any }) => ({ status: Status.error, key, params })

// errors with a key (ServerError, or app errors like arena's SystemError) are meant for the user
const isAppError = (error: any): boolean => typeof error?.key === 'string'

const sendError = (res: Response, error: any): void => {
  if (error instanceof UnauthorizedError) {
    res.status(ServerErrorCode.FORBIDDEN).json(getError(error))
  } else if (isAppError(error)) {
    res.status(error.statusCode ?? ServerErrorCode.INTERNAL_SERVER_ERROR).json(getError(error))
  } else {
    // details of unexpected errors (e.g. SQL errors) stay in the server log, not in the response
    res
      .status(error?.statusCode ?? ServerErrorCode.INTERNAL_SERVER_ERROR)
      .json(getError({ key: 'appErrors.generic', params: { text: 'Internal server error' } }))
  }
}

const sendOk = (response: Response): void => {
  response.json({ status: Status.ok })
}

export const Responses = {
  sendError,
  sendOk,
}
