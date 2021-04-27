import request from 'supertest'

import { ArenaApp } from '../../server/arenaApp'
import { ArenaServer } from '../../server'

let app: ArenaApp

const init = async () => {
  app = await ArenaServer.init()
  return app
}

const stop = async () => {}

export default {
  request,
  init,
  stop,
}
