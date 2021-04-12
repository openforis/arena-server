import { LogLevel } from './logLevel'
import { getLogger } from './log4js'

/**
 * Logger class with custom prefix.
 */
export class Logger {
  private static readonly LOGGER = getLogger('arena')
  private readonly prefix: string

  constructor(prefix: string) {
    this.prefix = prefix
  }

  private static isLevelEnabled(level: LogLevel): boolean {
    return Logger.LOGGER.isLevelEnabled(level)
  }

  private log(level: LogLevel, msgs: Array<any>): void {
    if (Logger.isLevelEnabled(level)) {
      const msgString = msgs.map((msg) => (typeof msg === 'object' ? JSON.stringify(msg) : msg)).join(' ')
      Logger.LOGGER.log(level, `${this.prefix} - ${msgString}`)
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
