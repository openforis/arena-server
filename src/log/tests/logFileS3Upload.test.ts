import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const putFileMock = jest.fn().mockResolvedValue(undefined)
const listFilesMock = jest.fn().mockResolvedValue([])
const deleteFilesMock = jest.fn().mockResolvedValue(undefined)

jest.mock('../../fileStorage/s3Storage', () => ({
  S3Storage: {
    fromEnvironment: jest.fn(() => ({
      putFile: putFileMock,
      listFiles: listFilesMock,
      deleteFiles: deleteFilesMock,
    })),
  },
}))

describe('logFileS3Upload', () => {
  const originalEnv = { ...process.env }
  let logFolder: string

  beforeEach(async () => {
    logFolder = await mkdtemp(path.join(os.tmpdir(), 'arena-logs-'))
    process.env = {
      ...originalEnv,
      LOG_S3_ENABLED: 'true',
      LOG_FOLDER: logFolder,
      FILE_STORAGE_AWS_ACCESS_KEY: 'key',
      FILE_STORAGE_AWS_SECRET_ACCESS_KEY: 'secret',
      FILE_STORAGE_AWS_S3_BUCKET_NAME: 'bucket',
      FILE_STORAGE_AWS_S3_BUCKET_REGION: 'eu-central-1',
      HOSTNAME: 'instance-a',
    }
    putFileMock.mockClear()
    listFilesMock.mockClear()
    deleteFilesMock.mockClear()
    listFilesMock.mockResolvedValue([])
  })

  afterEach(async () => {
    process.env = { ...originalEnv }
    await rm(logFolder, { recursive: true, force: true })
  })

  test('a server restart does not overwrite the previous run live log file in S3', async () => {
    // Run 1: server starts, writes to the live arena.log file, uploader ships it to S3.
    await writeFile(path.join(logFolder, 'arena.log'), 'run 1 content')
    jest.resetModules()
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must re-require after resetModules() for a fresh module instance with mocks intact
    const firstRun = require('../logFileS3Upload')
    await firstRun.uploadLogFilesToS3()

    expect(putFileMock).toHaveBeenCalledTimes(1)
    const [firstKey, firstBody] = putFileMock.mock.calls[0]
    expect(String(firstBody)).toBe('run 1 content')

    // Run 2: server restarts. The host filesystem is ephemeral, so arena.log starts fresh.
    putFileMock.mockClear()
    await writeFile(path.join(logFolder, 'arena.log'), 'run 2 content')
    jest.resetModules()
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must re-require after resetModules() for a fresh module instance with mocks intact
    const secondRun = require('../logFileS3Upload')
    await secondRun.uploadLogFilesToS3()

    expect(putFileMock).toHaveBeenCalledTimes(1)
    const [secondKey, secondBody] = putFileMock.mock.calls[0]
    expect(String(secondBody)).toBe('run 2 content')

    // The second run must not reuse the first run's S3 key, or it would overwrite run 1's log.
    expect(secondKey).not.toBe(firstKey)
  })

  test('deletes S3 log objects older than the retention window and keeps the rest', async () => {
    process.env.LOG_RETENTION_DAYS = '30'
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const staleFile = { key: 'logs/instance-b/arena.log', lastModified: new Date(now - 31 * dayMs) }
    const freshFile = { key: 'logs/instance-a/arena.log', lastModified: new Date(now - 1 * dayMs) }
    listFilesMock.mockResolvedValue([staleFile, freshFile])

    jest.resetModules()
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must re-require after resetModules() for a fresh module instance with mocks intact
    const { uploadLogFilesToS3 } = require('../logFileS3Upload')
    await uploadLogFilesToS3()

    expect(listFilesMock).toHaveBeenCalledWith('logs/')
    expect(deleteFilesMock).toHaveBeenCalledTimes(1)
    expect(deleteFilesMock).toHaveBeenCalledWith([staleFile.key])
  })

  test('does not call deleteFiles when nothing is stale', async () => {
    process.env.LOG_RETENTION_DAYS = '30'
    listFilesMock.mockResolvedValue([{ key: 'logs/instance-a/arena.log', lastModified: new Date() }])

    jest.resetModules()
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must re-require after resetModules() for a fresh module instance with mocks intact
    const { uploadLogFilesToS3 } = require('../logFileS3Upload')
    await uploadLogFilesToS3()

    expect(deleteFilesMock).not.toHaveBeenCalled()
  })
})
