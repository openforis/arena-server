import { Response } from 'express'

import { ServerError, ServerErrorCode, UnauthorizedError } from '../../server/error'
import { Responses } from '../responses'

const mockResponse = () => {
  const res = { statusCode: 0, body: undefined as any } as any
  res.status = (code: number) => {
    res.statusCode = code
    return res
  }
  res.json = (body: any) => {
    res.body = body
    return res
  }
  return res as Response & { statusCode: number; body: any }
}

describe('Responses.sendError', () => {
  test('does not expose the message of unexpected errors', () => {
    const res = mockResponse()
    Responses.sendError(res, new Error('relation "survey_1.secret_table" does not exist'))

    expect(res.statusCode).toBe(500)
    expect(JSON.stringify(res.body)).not.toContain('secret_table')
    expect(res.body.key).toBe('appErrors.generic')
  })

  test('sends key, params and status code of app errors', () => {
    const res = mockResponse()
    Responses.sendError(
      res,
      new ServerError('appErrors.userGroup.notFound', { groupUuid: 'g' }, ServerErrorCode.NOT_FOUND)
    )

    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({ status: 'error', key: 'appErrors.userGroup.notFound', params: { groupUuid: 'g' } })
  })

  test('sends unauthorized errors as forbidden', () => {
    const res = mockResponse()
    Responses.sendError(res, new UnauthorizedError('Tester'))

    expect(res.statusCode).toBe(403)
    expect(res.body.key).toBe('appErrors.userNotAuthorized')
  })
})
