import request, { Test } from 'supertest'

import TestAgent from 'supertest/lib/agent'
import { ArenaApp } from '../../../server'
import { ApiEndpoint } from '../../endpoint'
import { mockUser } from '../mock/user'

export class ApiTest {
  private readonly agent: TestAgent<Test>
  private authToken?: string

  private setAuthToken(authToken?: string): void {
    this.authToken = authToken
    if (this.authToken) {
      this.agent.set('Authorization', `Bearer ${this.authToken}`)
    }
  }

  constructor(app: ArenaApp) {
    this.agent = request(app.express)
    this.agent.set('Accept', 'application/json')
  }

  public get(url: string): Test {
    return this.agent.get(url)
  }

  public post(url: string): Test {
    return this.agent.post(url)
  }

  public login(): Test {
    const req = this.post(ApiEndpoint.auth.login()).send(mockUser)
    req.then(({ body = {} }) => {
      this.setAuthToken(body.authToken)
    })
    return req
  }
}
