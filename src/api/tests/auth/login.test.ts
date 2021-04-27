import request from 'supertest'
import { ArenaApp } from '../../../server/arenaApp'
import { ArenaServer } from '../../../server/arenaServer/index'
import { ApiEndpoint } from '../../endpoint/index'

const __MOCK_USER__ = {
  email: 'test@arena.com',
  password: 'test',
}

// const __INVALID_MOCK_USER__ = [{ username: 'username' }, { password: 'password' }, {}]

let app: ArenaApp

beforeAll(async () => {
  app = await ArenaServer.init()
})

describe(`POST ${ApiEndpoint.auth.login()}`, () => {
  describe('given a username and password', () => {
    test('should return json', async (done) => {
      request(app.express)
        .post(ApiEndpoint.auth.login())
        .send(__MOCK_USER__)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(() => {
          done()
        })

      // expect(response.type.includes('json')).toBeTruthy()
    })

    // test('should respond with a status code of 200', async () => {
    //   const response = await request(app.express).post(ApiEndpoint.auth.login()).send(__MOCK_USER__)
    //   expect(response.status).toBe(200)
    // })
  })

  // describe('when the username and password is missing', () => {
  //   test('should respond with a status code of 401', async () => {
  //     for (const body of __INVALID_MOCK_USER__) {
  //       const response = await request(app.express).post(ApiEndpoint.auth.login()).send(body)
  //       expect(response.status).toBe(401)
  //       expect(response.text).toBe('{"message":"Missing credentials"}')
  //     }
  //   })
  // })
})
