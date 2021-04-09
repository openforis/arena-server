import { Server } from 'http'

import { DB } from '../../db'
import { Logger } from '../../log'

const logger: Logger = new Logger('Arena server')

export const onShutdown = async (): Promise<void> => {
  logger.info(`server shutting down`)
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
        error && reject(error)
      }
    })
  })
