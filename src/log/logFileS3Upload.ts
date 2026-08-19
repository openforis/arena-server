import { mkdir, readFile, readdir, rm, stat, unlink } from 'node:fs/promises'
import path from 'node:path'

import { S3Storage } from '../fileStorage/s3Storage'
import { ProcessEnv } from '../processEnv'

const withLogFolder = async (): Promise<string> => {
  const logFolder = path.resolve(ProcessEnv.logFolder)
  await mkdir(logFolder, { recursive: true })
  return logFolder
}

const trimSlashes = (value: string): string => {
  let start = 0
  let end = value.length

  while (start < end && value[start] === '/') start += 1
  while (end > start && value[end - 1] === '/') end -= 1

  return value.slice(start, end)
}

const uploadLogFileToS3 = async (logFolder: string, fileName: string, s3Storage: S3Storage): Promise<void> => {
  const shouldDeleteAfterUpload = fileName !== 'arena.log'

  const absolutePath = path.join(logFolder, fileName)
  const fileStats = await stat(absolutePath)
  if (shouldDeleteAfterUpload && fileStats.size === 0) return

  const key = `${trimSlashes(ProcessEnv.logS3Prefix)}/${trimSlashes(ProcessEnv.instanceId)}/${fileName}`
  const body = await readFile(absolutePath)
  const contentType = fileName.endsWith('.gz') ? 'application/gzip' : 'text/plain; charset=utf-8'

  await s3Storage.putFile(key, body, contentType)

  if (shouldDeleteAfterUpload) {
    await unlink(absolutePath)
  }
}

const uploadPendingLogFilesToS3 = async (logFolder: string, s3Storage: S3Storage): Promise<void> => {
  const entries = await readdir(logFolder, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isFile()) continue
    await uploadLogFileToS3(logFolder, entry.name, s3Storage)
  }
}

const cleanupStaleLogFiles = async (logFolder: string): Promise<void> => {
  const cutoffTimestamp = Date.now() - ProcessEnv.logRetentionDays * 24 * 60 * 60 * 1000
  const entries = await readdir(logFolder, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isFile()) continue

    const absolutePath = path.join(logFolder, entry.name)
    const fileStats = await stat(absolutePath)
    if (fileStats.mtimeMs < cutoffTimestamp) {
      await rm(absolutePath, { force: true })
    }
  }
}

const uploadLogFilesToS3 = async (): Promise<void> => {
  if (!ProcessEnv.logS3Enabled) return

  const logFolder = await withLogFolder()
  const s3Storage = S3Storage.fromEnvironment()
  if (!s3Storage) return

  await uploadPendingLogFilesToS3(logFolder, s3Storage)
  await cleanupStaleLogFiles(logFolder)
}

export const startLogUploadPolling = (): void => {
  if (!ProcessEnv.logS3Enabled) return

  void uploadLogFilesToS3()
  const timer = setInterval(() => {
    void uploadLogFilesToS3()
  }, ProcessEnv.logUploadIntervalMs)
  timer.unref?.()
}
