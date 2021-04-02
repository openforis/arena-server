import { configure as configureLog4js, Log4js } from 'log4js'

// Only display color for terminals:
const layout = process.stdout.isTTY ? { type: 'colored' } : { type: 'basic' }

export const configure = (): Log4js =>
  configureLog4js({
    appenders: {
      console: { type: 'console', layout },
      // { file: { type: 'file', filename: 'arena.log' }
    },
    categories: {
      default: {
        appenders: ['console'],
        level: 'debug',
        // Appenders: ['file'], level: 'error'
      },
    },
  })
