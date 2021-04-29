import { Server } from 'http'

import { ArenaServer } from '../../../server'
import { ApiTest } from '../apiTest'
import { insertTestUser } from '../utils/insertTestUser'
import login from '../auth/login'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      api: ApiTest
    }
  }
}

let server: Server

beforeAll(async () => {
  const app = await ArenaServer.init()
  server = await ArenaServer.start(app)

  await insertTestUser()
  global.api = new ApiTest(server)
}, 10000)

afterAll(async () => {
  await ArenaServer.stop(server)
})

describe('API Tests', () => {
  login()
})
