import request from 'supertest'

import { initApp } from '../initApp'

describe('initApp', () => {
  test('initial middlewares see the requests rejected by the authentication middleware', async () => {
    const statuses: number[] = []
    const app = initApp({
      initialMiddlewares: [
        (_req, res, next) => {
          res.on('finish', () => statuses.push(res.statusCode))
          next()
        },
      ],
    })

    const response = await request(app.express).get('/api/surveys')

    expect(response.status).toBe(401)
    expect(statuses).toEqual([401])
  })
})
