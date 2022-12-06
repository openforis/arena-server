import { Server } from 'http'
import { createTerminus } from '@godaddy/terminus'

import { DB } from '../../db'
import { Logger } from '../../log'
import { ProcessEnv } from '../../processEnv'
import { WebSocketServer } from '../../webSocket'
import { ArenaApp } from '../arenaApp'
import { onShutdown } from './stop'

const logger: Logger = new Logger('Arena server')

export const start = (app: ArenaApp): Promise<Server> => {
  return new Promise<Server>((resolve, reject) => {
    logger.info(`server starting`)
    const port = ProcessEnv.port

    const server: Server = app.express.listen(port)

    const onListening = () => {
      //TODO: schedulers
      // await RecordPreviewCleanup.init()
      // await TempFilesCleanup.init()
      // await UserResetPasswordCleanup.init()
      server.removeListener('error', onError)

      logger.info(`server started and listening on port ${port}`)

      resolve(server)
    }

    const onError = (error: Error): void => {
      server.removeListener('listening', onListening)

      logger.error(`error starting server: ${error}`)

      reject(error)
    }

    server.once('error', onError)

    createTerminus(server, {
      healthChecks: {
        '/healthcheck': async () => {
          await DB.one(`select 1 from "user" limit 1`)
        },
      },
      onShutdown,
    })

    WebSocketServer.init(app, server)

    server.once('listening', onListening)
  })
}
