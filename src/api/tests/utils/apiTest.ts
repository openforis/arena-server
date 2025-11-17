import request, { SuperTest, Test } from 'supertest'

import { ArenaApp } from '../../../server'

export class ApiTest {
  private readonly superTest: SuperTest<Test>

  constructor(app: ArenaApp) {
    this.superTest = request(app.express)
  }

  public get(url: string): Test {
    return this.superTest.get(url).set('Accept', 'application/json')
  }

  public post(url: string): Test {
    return this.superTest.post(url).set('Accept', 'application/json')
  }
}
