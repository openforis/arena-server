import { Server } from 'http'

import { DB } from '../../db'
import { Logger } from '../../log'
import { WebSocketServer } from '../../webSocket'

const logger: Logger = new Logger('Arena server')

export const onShutdown = async (): Promise<void> => {
  logger.info(`server shutting down`)
  await WebSocketServer.shutdown()
  await DB.$pool.end()
}

export const stop = (server: Server): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    server.once('close', async () => {
      await onShutdown()
      resolve()
    })

    server.close((error: Error | undefined) => {
      if (error) {
        logger.error(error)
        reject(error)
      }
    })
  })
