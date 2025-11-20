import request, { Test } from 'supertest'

import TestAgent from 'supertest/lib/agent'
import { ArenaApp } from '../../../server'

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
}
