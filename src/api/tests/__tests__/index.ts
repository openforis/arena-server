import { ApiTest } from '../apiTest'
import Login from '../auth/login'
import { insertTestUser } from '../utils/insertTestUser'

let apiTest: ApiTest

beforeAll(async () => {
  await insertTestUser()
  apiTest = await ApiTest.getInstance()
  global.apiTest = apiTest
}, 10000)

afterAll(async () => {
  await global.apiTest.stopServer()
})

describe('API Tests', () => {
  Login()
})
