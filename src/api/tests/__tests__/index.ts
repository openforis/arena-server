import { ApiTest } from '../apiTest'
import Login from '../auth/login'
import { insertTestUser } from '../utils/insertTestUser'
import { ArenaServer } from '../../../server/arenaServer/index'

let apiTest: ApiTest

beforeAll(async () => {
  await insertTestUser()
  apiTest = await ApiTest.getInstance()
  global.apiTest = apiTest
}, 10000)

afterAll(async () => {
  await ArenaServer.stop(apiTest.getServer())
})

describe('API Tests', () => {
  Login()
})
