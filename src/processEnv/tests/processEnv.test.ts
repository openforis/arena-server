import { buildProcessEnv } from '../index'

describe('ProcessEnv log S3 settings', () => {
  test('enables log shipping when file storage S3 vars are configured', () => {
    const env = {
      ...process.env,
      FILE_STORAGE_AWS_ACCESS_KEY: 'key',
      FILE_STORAGE_AWS_SECRET_ACCESS_KEY: 'secret',
      FILE_STORAGE_AWS_S3_BUCKET_NAME: 'logs-bucket',
      FILE_STORAGE_AWS_S3_BUCKET_REGION: 'eu-central-1',
    }

    const ProcessEnv = buildProcessEnv(env)

    expect(ProcessEnv.fileStorageAwsEnabled).toBe(true)
    expect(ProcessEnv.logS3Enabled).toBe(true)
  })

  test('keeps log shipping disabled when file storage S3 vars are missing', () => {
    const env = { ...process.env }
    delete env.FILE_STORAGE_AWS_ACCESS_KEY
    delete env.FILE_STORAGE_AWS_SECRET_ACCESS_KEY
    delete env.FILE_STORAGE_AWS_S3_BUCKET_NAME
    delete env.FILE_STORAGE_AWS_S3_BUCKET_REGION

    const ProcessEnv = buildProcessEnv(env)

    expect(ProcessEnv.fileStorageAwsEnabled).toBe(false)
    expect(ProcessEnv.logS3Enabled).toBe(false)
  })
})
