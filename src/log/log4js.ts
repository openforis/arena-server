import path from 'node:path'

import { configure, Logger } from 'log4js'

import { ProcessEnv } from '../processEnv'
import { startLogUploadPolling } from './logFileS3Upload'

// Only display color for terminals:
const layout = process.stdout.isTTY ? { type: 'colored' } : { type: 'basic' }

startLogUploadPolling()

export const getLogger = (category?: string): Logger => {
  const fileAppender = {
    type: 'file',
    filename: path.join(path.resolve(ProcessEnv.logFolder), 'arena.log'),
    maxLogSize: ProcessEnv.logMaxSizeBytes,
    backups: 5,
    compress: true,
  }

  const log4js = configure({
    appenders: {
      console: { type: 'console', layout },
      file: fileAppender,
    },
    categories: {
      default: {
        appenders: ['console', 'file'],
        level: 'debug',
      },
    },
  })

  return log4js.getLogger(category)
}
