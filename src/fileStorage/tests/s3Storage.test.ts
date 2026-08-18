import { S3Storage } from '../s3Storage'

const sendMock = jest.fn()

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
    PutObjectCommand: jest.fn().mockImplementation((params) => params),
    DeleteObjectCommand: jest.fn().mockImplementation((params) => params),
  }
})

describe('S3Storage', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    jest.clearAllMocks()
  })

  test('uploadFile sends a PutObjectCommand with the given payload and key', async () => {
    const storage = new S3Storage({
      bucketName: 'my-bucket',
      region: 'eu-central-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    })

    await storage.putFile('logs/app.log', Buffer.from('hello world'), 'text/plain; charset=utf-8')

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0][0]).toMatchObject({
      Bucket: 'my-bucket',
      Key: 'logs/app.log',
      ContentType: 'text/plain; charset=utf-8',
      Body: Buffer.from('hello world'),
    })
  })
})
