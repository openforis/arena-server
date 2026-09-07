import { mkdir, readFile, readdir, rm, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { gzip } from 'node:zlib'
import { promisify } from 'node:util'

import { S3Storage } from '../fileStorage/s3Storage'
import { ProcessEnv } from '../processEnv'
import { LOG_FILE_NAME } from './logFileConstants'

const gzipAsync = promisify(gzip)

// Identifies the current process run, so its live log file gets its own S3 key and a
// restart (which starts the live log file fresh on typical ephemeral-filesystem hosting) never
// overwrites the previous run's uploaded content.
const processStartedAt = new Date().toISOString().replace(/[:.]/g, '-')

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
  const isLiveFile = fileName === LOG_FILE_NAME
  const shouldDeleteAfterUpload = !isLiveFile
  // Rotated backups are already gzipped locally (log4js file appender has compress: true);
  // the live file is still plain text (actively being appended to), so gzip it on the way out
  // instead of storing it uncompressed in S3.
  const isAlreadyCompressed = fileName.endsWith('.gz')

  const absolutePath = path.join(logFolder, fileName)
  const fileStats = await stat(absolutePath)
  if (shouldDeleteAfterUpload && fileStats.size === 0) return

  const rawBody = await readFile(absolutePath)
  const body = isAlreadyCompressed ? rawBody : await gzipAsync(rawBody)
  const s3FileName = isLiveFile ? `arena-${processStartedAt}.log.gz` : fileName
  const key = `${trimSlashes(ProcessEnv.logS3Prefix)}/${trimSlashes(ProcessEnv.instanceId)}/${s3FileName}`

  await s3Storage.putFile(key, body, 'application/gzip')

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

const getRetentionCutoffTimestamp = (): number => Date.now() - ProcessEnv.logRetentionDays * 24 * 60 * 60 * 1000

const cleanupStaleLogFiles = async (logFolder: string): Promise<void> => {
  const cutoffTimestamp = getRetentionCutoffTimestamp()
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

// Prunes old log objects across all instances' folders in S3, not just the current instance's,
// since an instance's own id can change across restarts (e.g. container hostname) leaving its
// previous folder orphaned and otherwise never revisited for cleanup.
const cleanupStaleS3LogFiles = async (s3Storage: S3Storage): Promise<void> => {
  const cutoffTimestamp = getRetentionCutoffTimestamp()
  const prefix = `${trimSlashes(ProcessEnv.logS3Prefix)}/`
  const files = await s3Storage.listFiles(prefix)

  const staleKeys = files
    .filter((file) => (file.lastModified?.getTime() ?? 0) < cutoffTimestamp)
    .map((file) => file.key)

  if (staleKeys.length > 0) {
    await s3Storage.deleteFiles(staleKeys)
  }
}

export const uploadLogFilesToS3 = async (): Promise<void> => {
  if (!ProcessEnv.logS3Enabled) return

  const logFolder = await withLogFolder()
  const s3Storage = S3Storage.fromEnvironment()
  if (!s3Storage) return

  await uploadPendingLogFilesToS3(logFolder, s3Storage)
  await cleanupStaleLogFiles(logFolder)
  await cleanupStaleS3LogFiles(s3Storage)
}

export const startLogUploadPolling = (): void => {
  if (!ProcessEnv.logS3Enabled) return

  void uploadLogFilesToS3()
  const timer = setInterval(() => {
    void uploadLogFilesToS3()
  }, ProcessEnv.logUploadIntervalMs)
  timer.unref?.()
}
