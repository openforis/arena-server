import { Server } from 'node:http'

import { ArenaServer } from '../../server'
import { ApiTest } from './utils/apiTest'
import { insertTestUser } from './utils/insertTestUser'
import login from './auth/login'
import info from './info'

declare global {
  var api: ApiTest
}

let server: Server

beforeAll(async () => {
  const app = await ArenaServer.init()
  server = await ArenaServer.start(app)
  await insertTestUser()
  globalThis.api = new ApiTest(app)
})

afterAll(async () => {
  await ArenaServer.stop(server)
})

describe('API Tests', () => {
  test('server is listening', () => {
    expect(server.listening).toBe(true)
  })

  login()
  info()
})
