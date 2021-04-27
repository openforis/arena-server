import testApi from '../utils'

import { ArenaApp } from '../../../server/arenaApp'

import { ApiEndpoint } from '../../endpoint/index'

const __MOCK_USER__ = {
  email: 'test@arena.com',
  password: 'test',
}

const __INVALID_MOCK_USER__ = { email: 'username' }

let app: ArenaApp

beforeAll(async () => {
  app = await testApi.init()
})

afterAll(async () => {
  await testApi.stop()
})

describe(`POST ${ApiEndpoint.auth.login()} given`, () => {
  test('a username and password correct user is returned and logged in', async () => {
     const response = await testApi
        .request(app.express)
        .post(ApiEndpoint.auth.login())
        .set('Accept', 'application/json')
        .send(__MOCK_USER__)
        .expect('Content-Type', /json/)
        .expect(200)

      const data = JSON.parse(response.text)
      expect(data.user).toBeDefined()
      expect(data.user.uuid).toBeDefined()
      expect(data.user.email).toBe(__MOCK_USER__.email)
  })

  test('missing param, should respond with a status code of 401', async (done) => {
    const response = await testApi
      .request(app.express)
      .post(ApiEndpoint.auth.login())
      .set('Accept', 'application/json')
      .send(__INVALID_MOCK_USER__)
      .expect(401)
      .then(() => done())
      .catch(console.error)

    expect(response.status).toBe(401)
    const data = JSON.parse(response.text)
    expect(data.message).toBe('Missing credentials')
  })
})
