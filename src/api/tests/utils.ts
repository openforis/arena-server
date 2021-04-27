import request from 'supertest'

import { ArenaApp } from '../../../server/arenaApp'
import { ArenaServer } from '../../../server/arenaServer/index'

import { Server } from 'http'

let app: ArenaApp
let server: Server

const init = async () => {
  app = await ArenaServer.init()
  server = await ArenaServer.start(app)
  return app
}

const stop = async () => {
  await ArenaServer.stop(server)
}
export default {
  request,
  init,
  stop,
}
