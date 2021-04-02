import { LogLevel } from './logLevel'
import { configure } from './configure'

const Log4js = configure()
const logger = Log4js.getLogger('arena')

/**
 * Logger class with custom prefix.
 */
export class Logger {
  private readonly prefix: string

  constructor(prefix: string) {
    this.prefix = prefix
  }

  private static isLevelEnabled(level: LogLevel): boolean {
    return logger.isLevelEnabled(level)
  }

  private log(level: LogLevel, ...msgs: Array<any>): void {
    if (Logger.isLevelEnabled(level)) {
      const msgString = msgs.map((msg) => (typeof msg === 'object' ? JSON.stringify(msg) : msg)).join(' ')
      logger.log(level, `${this.prefix} - ${msgString}`)
    }
  }

  isDebugEnabled(): boolean {
    return Logger.isLevelEnabled(LogLevel.debug)
  }

  isInfoEnabled(): boolean {
    return Logger.isLevelEnabled(LogLevel.info)
  }

  isWarnEnabled(): boolean {
    return Logger.isLevelEnabled(LogLevel.warn)
  }

  isErrorEnabled(): boolean {
    return Logger.isLevelEnabled(LogLevel.error)
  }

  debug(...msgs: Array<any>): void {
    this.log(LogLevel.debug, msgs)
  }

  info(...msgs: Array<any>): void {
    this.log(LogLevel.info, msgs)
  }

  warn(...msgs: Array<any>): void {
    this.log(LogLevel.warn, msgs)
  }

  error(...msgs: Array<any>): void {
    this.log(LogLevel.error, msgs)
  }
}
