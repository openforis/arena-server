import { Server } from 'http'
import request, { SuperTest, Test } from 'supertest'

export class ApiTest {
  private readonly superTest: SuperTest<Test>
  public cookie = ''

  constructor(server: Server) {
    this.superTest = request(server)
  }

  public get(url: string): Test {
    return this.superTest.get(url).set('Accept', 'application/json').set('cookie', this.cookie)
  }

  public post(url: string): Test {
    return this.superTest.post(url).set('Accept', 'application/json').set('cookie', this.cookie)
  }
}
