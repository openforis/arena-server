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

describe('ProcessEnv DATABASE_URL parsing', () => {
  test('parses postgresql scheme and url-encoded credentials', () => {
    const env = {
      ...process.env,
      DATABASE_URL: 'postgresql://user%40name:p%40ss%3Aword@localhost:5433/arena',
      PGUSER: 'fallback-user',
      PGPASSWORD: 'fallback-password',
      PGHOST: 'fallback-host',
      PGPORT: '5432',
      PGDATABASE: 'fallback-db',
    }

    const ProcessEnv = buildProcessEnv(env)

    expect(ProcessEnv.pgUser).toBe('user@name')
    expect(ProcessEnv.pgPassword).toBe('p@ss:word')
    expect(ProcessEnv.pgHost).toBe('localhost')
    expect(ProcessEnv.pgPort).toBe(5433)
    expect(ProcessEnv.pgDatabase).toBe('arena')
  })

  test('parses ipv6 host and non-word database name', () => {
    const env = {
      ...process.env,
      DATABASE_URL: 'postgres://db_user:db_pass@[2001:db8::1]:5444/my-db_01',
    }

    const ProcessEnv = buildProcessEnv(env)

    expect(ProcessEnv.pgUser).toBe('db_user')
    expect(ProcessEnv.pgPassword).toBe('db_pass')
    expect(ProcessEnv.pgHost).toBe('2001:db8::1')
    expect(ProcessEnv.pgPort).toBe(5444)
    expect(ProcessEnv.pgDatabase).toBe('my-db_01')
  })

  test('falls back to PG* vars when DATABASE_URL cannot be parsed', () => {
    const env = {
      ...process.env,
      DATABASE_URL: 'not a valid url',
      PGUSER: 'fallback-user',
      PGPASSWORD: 'fallback-password',
      PGHOST: 'fallback-host',
      PGPORT: '6000',
      PGDATABASE: 'fallback-db',
    }

    const ProcessEnv = buildProcessEnv(env)

    expect(ProcessEnv.pgUser).toBe('fallback-user')
    expect(ProcessEnv.pgPassword).toBe('fallback-password')
    expect(ProcessEnv.pgHost).toBe('fallback-host')
    expect(ProcessEnv.pgPort).toBe(6000)
    expect(ProcessEnv.pgDatabase).toBe('fallback-db')
  })
})
