import { configure, Logger } from 'log4js'

// Only display color for terminals:
const layout = process.stdout.isTTY ? { type: 'colored' } : { type: 'basic' }

export const getLogger = (category?: string): Logger => {
  const log4js = configure({
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

  return log4js.getLogger(category)
}
