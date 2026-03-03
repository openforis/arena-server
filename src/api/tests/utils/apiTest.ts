import request, { Test } from 'supertest'

import TestAgent from 'supertest/lib/agent'
import { ArenaApp } from '../../../server'
import { ApiEndpoint } from '../../endpoint'
import { mockUser } from '../mock/user'

export class ApiTest {
  private readonly agent: TestAgent<Test>
  private authToken?: string

  private withAuthToken(test: Test): Test {
    if (this.authToken) {
      return test.set('Authorization', `Bearer ${this.authToken}`)
    }
    return test
  }

  constructor(app: ArenaApp) {
    this.agent = request(app.express)
    this.agent.set('Accept', 'application/json')
  }

  public get(url: string): Test {
    return this.withAuthToken(this.agent.get(url))
  }

  public post(url: string): Test {
    return this.withAuthToken(this.agent.post(url))
  }

  public login(): Test {
    const req = this.post(ApiEndpoint.auth.login()).send(mockUser).expect(200)
    req.then(({ body = {} }) => {
      this.authToken = body.authToken
    })
    return req
  }
}
