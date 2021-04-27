import request from 'supertest'
import { ArenaApp } from '../../../server/arenaApp'
import { ArenaServer } from '../../../server/arenaServer/index'
import { ApiEndpoint } from '../../endpoint/index'
import { Server } from 'http'

const __MOCK_USER__ = {
  email: 'test@arena.com',
  password: 'test',
}

const __INVALID_MOCK_USER__ = { email: 'username' }

let app: ArenaApp
let server: Server

beforeAll(async () => {
  app = await ArenaServer.init()
  // Start server
  // if process.env.test == start server but dont start
  server = await ArenaServer.start(app)
})

afterAll(async () => {
  await ArenaServer.stop(server)
})

describe(`POST ${ApiEndpoint.auth.login()} given`, () => {
  test('a username and password correct user is returned and logged in', async () => {
    try {
      const response = await request(app.express)
        .post(ApiEndpoint.auth.login())
        .set('Accept', 'application/json')
        .send(__MOCK_USER__)
        .expect('Content-Type', /json/)
        .expect(200)

      const data = JSON.parse(response.text)
      expect(data.user).toBeDefined()
      expect(data.user.uuid).toBeDefined()
      expect(data.user.email).toBe(__MOCK_USER__.email)
    } catch (e) {
      console.error(e)
    }
  })

  test('missing param, should respond with a status code of 401', async (done) => {
    const response = await request(app.express)
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
