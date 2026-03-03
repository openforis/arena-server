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
  }

  public get(url: string): Test {
    return this.withAuthToken(this.agent.get(url).set('Accept', 'application/json'))
  }

  public post(url: string): Test {
    return this.withAuthToken(this.agent.post(url).set('Accept', 'application/json'))
  }

  public async login(): Promise<void> {
    const req = await this.post(ApiEndpoint.auth.login()).send(mockUser).expect(200)
    const { body = {} } = req
    this.authToken = body.authToken
  }
}
