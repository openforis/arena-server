import http, { Server } from 'http'
import { createTerminus } from '@godaddy/terminus'

import { DB } from '../../db'
import { Logger } from '../../log'
import { ProcessEnv } from '../../processEnv'
import { WebSocketServer } from '../../webSocket'
import { ArenaApp } from '../arenaApp'
import { onShutdown } from './stop'

const logger: Logger = new Logger('Arena server')

export const start = async (app: ArenaApp): Promise<Server> => {
  logger.info(`server starting`)
  const port = ProcessEnv.arenaPort

  const server: Server = http.createServer(app.express)

  createTerminus(server, {
    healthChecks: {
      '/healthcheck': async () => {
        await DB.one(`select 1 from "user" limit 1`)
      },
    },
    onShutdown,
  })

  // Awaited before the server starts accepting connections: WebSocketServer.init sets up
  // ClusterBus's LISTEN, which notifyUser/notifySocket depend on for local delivery. Starting
  // to listen first could let an early request (e.g. login) publish a cluster event before
  // this dyno is subscribed to receive its own NOTIFY back.
  await WebSocketServer.init(app, server)

  return new Promise<Server>((resolve, reject) => {
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
    server.once('listening', onListening)

    server.listen(port)
  })
}
