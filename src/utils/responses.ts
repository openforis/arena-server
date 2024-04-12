import { Response } from 'express'
import { ServerError, ServerErrorCode, UnauthorizedError } from '../server/error'

enum Status {
  ok = 'ok',
  error = 'error',
}

const getError = (error: any) => ({ status: Status.error, ...error })

const sendError = (res: Response, error: any): void => {
  if (error instanceof UnauthorizedError) {
    res.status(ServerErrorCode.FORBIDDEN).json(getError(error))
  } else if (error instanceof ServerError) {
    res.status(error.statusCode).json(getError(error))
  } else {
    res.status(error.statusCode).json(
      getError({
        key: 'appErrors.generic',
        params: { text: `Could not serve: ${error.toString()}` },
      })
    )
  }
}

const sendOk = (response: Response): void => {
  response.json({ status: Status.ok })
}

export const Responses = {
  sendError,
  sendOk,
}
