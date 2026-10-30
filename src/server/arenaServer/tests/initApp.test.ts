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

  // express routing is case-insensitive: these paths would reach the API routes
  test.each(['/API/surveys', '/Api/surveys', '/AUTH/login', '/API/public/record-export/token'])(
    'rejects unauthenticated API requests regardless of the path case: %s',
    async (path) => {
      const app = initApp()

      const response = await request(app.express).get(path)

      expect(response.status).toBe(401)
    }
  )

  test('lets unauthenticated page requests continue', async () => {
    const app = initApp()

    const response = await request(app.express).get('/app/home')

    expect(response.status).toBe(404)
  })
})
