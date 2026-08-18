import { mkdir, readFile, readdir, rm, stat, unlink } from 'node:fs/promises'
import path from 'node:path'

import { configure, Logger } from 'log4js'

import { S3Storage } from '../fileStorage/s3Storage'
import { ProcessEnv } from '../processEnv'

// Only display color for terminals:
const layout = process.stdout.isTTY ? { type: 'colored' } : { type: 'basic' }

const withLogFolder = async (): Promise<string> => {
  const logFolder = path.resolve(ProcessEnv.logFolder)
  await mkdir(logFolder, { recursive: true })
  return logFolder
}

const uploadLogFilesToS3 = async (): Promise<void> => {
  if (!ProcessEnv.logS3Enabled) return

  const logFolder = await withLogFolder()
  const s3Storage = S3Storage.fromEnvironment()
  if (!s3Storage) return

  const files = await readdir(logFolder, { withFileTypes: true })

  for (const entry of files) {
    if (!entry.isFile()) continue

    const absolutePath = path.join(logFolder, entry.name)
    const fileStats = await stat(absolutePath)
    if (fileStats.size === 0) continue

    const key = `${ProcessEnv.logS3Prefix.replace(/^\/+|\/+$/g, '')}/${entry.name}`
    const body = await readFile(absolutePath)

    await s3Storage.putFile(key, body, 'text/plain; charset=utf-8')

    await unlink(absolutePath)
  }

  const cutoffTimestamp = Date.now() - ProcessEnv.logRetentionDays * 24 * 60 * 60 * 1000
  const staleEntries = await readdir(logFolder, { withFileTypes: true })
  for (const entry of staleEntries) {
    if (!entry.isFile()) continue
    const absolutePath = path.join(logFolder, entry.name)
    const fileStats = await stat(absolutePath)
    if (fileStats.mtimeMs < cutoffTimestamp) {
      await rm(absolutePath, { force: true })
    }
  }
}

const startLogUploadPolling = (): void => {
  if (!ProcessEnv.logS3Enabled) return

  void uploadLogFilesToS3()
  const timer = setInterval(() => {
    void uploadLogFilesToS3()
  }, ProcessEnv.logUploadIntervalMs)
  timer.unref?.()
}

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
