import { Server } from 'http'
import { createTerminus } from '@godaddy/terminus'

import { DB } from '../../db'
import { Logger } from '../../log'
import { ProcessEnv } from '../../processEnv'
import { WebSocketServer } from '../../webSocket/server'
import { ArenaApp } from '../arenaApp'
import { onShutdown } from './stop'

const logger: Logger = new Logger('Arena server')

export const start = (app: ArenaApp): Promise<Server> =>
  new Promise<Server>((resolve) => {
    logger.info(`server starting`)
    const port = ProcessEnv.port

    // process.env.test == dont start this
    const server: Server = app.express.listen(port)
    WebSocketServer.init(app, server)

    createTerminus(server, {
      healthChecks: {
        '/healthcheck': async () => {
          await DB.one(`select 1 from "user" limit 1`)
        },
      },
      onShutdown,
    })

    server.once('listening', () => {
      //TODO: schedulers
      // await RecordPreviewCleanup.init()
      // await TempFilesCleanup.init()
      // await UserResetPasswordCleanup.init()

      logger.info(`server started and listening on port ${port}`)
      resolve(server)
    })
  })
