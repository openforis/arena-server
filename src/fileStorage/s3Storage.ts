import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

import { ProcessEnv } from '../processEnv'

export type S3StorageOptions = {
  bucketName: string
  region: string | undefined
  accessKeyId: string
  secretAccessKey: string
  endpoint?: string
  forcePathStyle?: boolean
}

export class S3Storage {
  static fromEnvironment(): S3Storage | null {
    if (!ProcessEnv.fileStorageAwsEnabled) return null

    return new S3Storage({
      bucketName: ProcessEnv.fileStorageAwsS3BucketName!,
      region: ProcessEnv.fileStorageAwsS3BucketRegion,
      accessKeyId: ProcessEnv.fileStorageAwsAccessKey!,
      secretAccessKey: ProcessEnv.fileStorageAwsSecretAccessKey!,
    })
  }

  private readonly client: S3Client

  constructor(private readonly options: S3StorageOptions) {
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    })
  }

  async putFile(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    )
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.options.bucketName,
        Key: key,
      })
    )
  }
}
