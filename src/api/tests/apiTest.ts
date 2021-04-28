import { Server } from 'http'
import request, { SuperTest, Test } from 'supertest'

import { ArenaServer } from '../../server'

export class ApiTest {
  private readonly server: Server
  private superTest: SuperTest<Test>

  private constructor(server: Server) {
    this.server = server
    this.superTest = request(this.server)
  }

  public static async getInstance(): Promise<ApiTest> {
    const app = await ArenaServer.init()
    const server = await ArenaServer.start(app)
    return new ApiTest(server)
  }

  public get(url: string): request.Test {
    return this.superTest.get(url).set('Accept', 'application/json')
  }

  public post(url: string): request.Test {
    return this.superTest.post(url).set('Accept', 'application/json')
  }

  public async stopServer(): Promise<void> {
    await ArenaServer.stop(this.server)
  }
}
