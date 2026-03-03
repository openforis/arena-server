import request, { Test } from 'supertest'

import TestAgent from 'supertest/lib/agent'
import { ArenaApp } from '../../../server'
import { ApiEndpoint } from '../../endpoint'
import { mockUser } from '../mock/user'

export class ApiTest {
  private readonly agent: TestAgent<Test>

  constructor(app: ArenaApp) {
    this.agent = request(app.express)
  }

  public get(url: string): Test {
    return this.agent.get(url).set('Accept', 'application/json')
  }

  public post(url: string): Test {
    return this.agent.post(url).set('Accept', 'application/json')
  }

  public login(): Test {
    return this.post(ApiEndpoint.auth.login()).send(mockUser).expect(200)
  }
}
