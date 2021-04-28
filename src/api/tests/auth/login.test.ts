import { User } from '@openforis/arena-core'

import { ApiEndpoint } from '../../endpoint'
import { ApiTest } from '../apiTest'
import { mockUser, mockUserInvalid } from '../mock/user'

let apiTest: ApiTest
beforeAll(async () => {
  apiTest = await ApiTest.getInstance()
}, 10000)

afterAll(async () => {
  await apiTest.stopServer()
})

describe(`Login ${ApiEndpoint.auth.login()}`, () => {
  test('Login successfully', async (done) => {
    const response = await apiTest
      .post(ApiEndpoint.auth.login())
      .send(mockUser)
      .expect('Content-Type', /json/)
      .expect(200)

    const user: User = response.body.user
    expect(user).toBeDefined()
    expect(user.uuid).toBeDefined()
    expect(user.email).toBe(mockUser.email)
    done()
  })

  test('Login unsuccessfully', async (done) => {
    const response = await apiTest.post(ApiEndpoint.auth.login()).send(mockUserInvalid).expect(401)

    const message: string = response.body.message
    expect(response.status).toBe(401)
    expect(message).toBe('Missing credentials')
    done()
  })
})
