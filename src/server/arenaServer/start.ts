import { Server } from 'http'
import { createTerminus } from '@godaddy/terminus'

import { DB } from '../../db'
import { Logger } from '../../log'
import { ProcessEnv } from '../../processEnv'
import { ArenaApp } from '../arenaApp'

const logger: Logger = new Logger('Arena server')

export const start = (arenaApp: ArenaApp): Server => {
  logger.info(`server starting`)
  const { app } = arenaApp

  const port = ProcessEnv.arenaPort
  const server: Server = app.listen(port, () => logger.info(`server started and listening on port ${port}`))

  createTerminus(server, {
    signal: 'SIGINT',
    healthChecks: {
      '/healthcheck': async () => {
        await DB.one(`select 1 from "user" limit 1`)
      },
    },
    onSignal: async () => {
      logger.info(`server shutting down`)
      await DB.$pool.end()
    },
  })

  //TODO: schedulers
  // await RecordPreviewCleanup.init()
  // await TempFilesCleanup.init()
  // await UserResetPasswordCleanup.init()

  return server
}
