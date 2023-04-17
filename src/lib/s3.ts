import {
  S3Client,
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ObjectIdentifier,
  PutObjectCommandInput,
  HeadBucketCommand,
  AbortMultipartUploadCommand,
  CompletedPart,
  CompleteMultipartUploadCommandInput,
  AbortMultipartUploadCommandInput,
  CreateMultipartUploadCommandInput,
  UploadPartCommandInput,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  UploadPartRequest,
} from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import {
  type BucketS3MultipartPartsSerialization,
  type BucketS3MultipartSerialization,
  type IBucketS3MultipartParts,
  type IBucketS3MultipartResponse,
  type IBucketS3PutItemOptions,
  type BucketS3Serialization,
  type IBucketS3Response,
  type S3Config,
} from './types'

export enum BitifulBucketEnum {
  dounione = 'dounione',
  moss = 'moss',
}

export class BucketService {
  private readonly s3Client: S3Client
  private readonly bucket: string
  private readonly cdnUrl: (bucket: string) => string

  constructor(config: S3Config) {
    const Bitiful = config
    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: Bitiful.accessKeyId,
        secretAccessKey: Bitiful.secretAccessKey,
      },
      region: Bitiful.region,
      endpoint: Bitiful.endpoint,
    })
    this.bucket = BitifulBucketEnum.moss
    this.cdnUrl = (bucket: string) => {
      if (bucket === BitifulBucketEnum.dounione && Bitiful.cdnUrl2) {
        return Bitiful.cdnUrl2
      }
      return Bitiful.cdnUrl
    }
  }

  async checkConnection(): Promise<Record<string, any>> {
    const command: HeadBucketCommand = new HeadBucketCommand({
      Bucket: this.bucket,
    })

    try {
      const check: Record<string, any> = await this.s3Client.send(command)

      return check
    } catch (err: any) {
      throw err
    }
  }

  async listBucket(): Promise<string[]> {
    const command: ListBucketsCommand = new ListBucketsCommand({})
    const listBucket: Record<string, any> = await this.s3Client.send(command)
    return listBucket.Buckets.map((val: Record<string, any>) => val.Name)
  }

  async listItemInBucket(
    prefix?: string,
    bucket = this.bucket,
  ): Promise<BucketS3Serialization[]> {
    const command: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    })
    const listItems: Record<string, any> = await this.s3Client.send(command)

    return listItems.Contents.map((val: Record<string, any>) => {
      const lastIndex: number = val.Key.lastIndexOf('/')
      const path: string = val.Key.substring(0, lastIndex)
      const filename: string = val.Key.substring(lastIndex, val.Key.length)
      const mime: string = filename
        .substring(filename.lastIndexOf('.') + 1, filename.length)
        .toLocaleUpperCase()

      return {
        path,
        pathWithFilename: val.Key,
        filename: filename,
        completedUrl: `${this.cdnUrl(bucket)}/${val.Key}`,
        baseUrl: this.cdnUrl(bucket),
        mime,
        bucket,
        type: 'bitiful',
      }
    })
  }

  async getItemInBucket(
    filename: string,
    path?: string,
    bucket = this.bucket,
  ): Promise<Record<string, any>> {
    if (path) path = path.startsWith('/') ? path.replace('/', '') : `${path}`

    const key: string = path ? `${path}/${filename}` : filename
    const command: GetObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const item: Record<string, any> = await this.s3Client.send(command)

    return item.Body
  }

  async putItemInBucket(
    filename: string,
    content: string | Uint8Array | Buffer | Readable | ReadableStream | Blob,
    options?: IBucketS3PutItemOptions,
    bucket = this.bucket,
  ): Promise<BucketS3Serialization> {
    let path: string | undefined =
      options && options.path ? options.path : undefined
    const acl: string = options && options.acl ? options.acl : 'public-read'

    if (path) path = path.startsWith('/') ? path.replace('/', '') : `${path}`

    const mime: string = filename
      .substring(filename.lastIndexOf('.') + 1, filename.length)
      .toLowerCase()
    const key: string = path ? `${path}/${filename}` : filename
    const putObjectOption: PutObjectCommandInput = {
      Bucket: bucket,
      Key: key,
      Body: content,
      ACL: acl,
    }
    if (options?.ContentType) {
      putObjectOption.ContentType = options.ContentType
    }
    const command: PutObjectCommand = new PutObjectCommand(putObjectOption)

    await this.s3Client.send(command)

    return {
      path: path as string,
      pathWithFilename: key,
      filename: filename,
      completedUrl: `${this.cdnUrl(bucket)}/${key}`,
      baseUrl: this.cdnUrl(bucket),
      mime,
      bucket,
      type: 'bitiful',
    }
  }

  async deleteItemInBucket(
    filename: string,
    bucket = this.bucket,
  ): Promise<void> {
    const command: DeleteObjectCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: filename,
    })

    try {
      await this.s3Client.send(command)
    } catch (e) {
      throw e
    }
  }

  async deleteItemsInBucket(
    filenames: string[],
    bucket = this.bucket,
  ): Promise<void> {
    const keys: ObjectIdentifier[] = filenames.map((val) => ({
      Key: val,
    }))
    const command: DeleteObjectsCommand = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: keys,
      },
    })

    try {
      await this.s3Client.send(command)
    } catch (e) {
      throw e
    }
  }

  async deleteResourcesByPrefix(
    prefix: string,
    bucket = this.bucket,
  ): Promise<void> {
    try {
      // 获取指定前缀的对象列表
      const commandList = await new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      })
      const lists = await this.s3Client.send(commandList)

      const objects = lists.Contents?.map((obj) => ({ Key: obj.Key }))

      if (objects && objects?.length > 0) {
        // 批量删除对象
        await this.s3Client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: objects,
            },
          }),
        )
      }
    } catch (error) {
      console.error(`Error deleting objects with prefix "${prefix}":`, error)
    }
  }

  async deleteFolder(dir: string, bucket = this.bucket): Promise<void> {
    const commandList: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: dir,
    })
    const lists = await this.s3Client.send(commandList)

    try {
      const listItems = lists.Contents?.map((val) => ({
        Key: val.Key,
      }))
      const commandDeleteItems: DeleteObjectsCommand = new DeleteObjectsCommand(
        {
          Bucket: bucket,
          Delete: {
            Objects: listItems,
          },
        },
      )

      await this.s3Client.send(commandDeleteItems)

      const commandDelete: DeleteObjectCommand = new DeleteObjectCommand({
        Bucket: bucket,
        Key: dir,
      })
      await this.s3Client.send(commandDelete)

      return
    } catch (e) {
      throw e
    }
  }
  async createMultiPart(
    filename: string,
    options?: IBucketS3PutItemOptions,
    bucket = this.bucket,
  ): Promise<BucketS3MultipartSerialization> {
    let path: string | undefined =
      options && options.path ? options.path : undefined
    const acl: string = options && options.acl ? options.acl : 'public-read'

    if (path) path = path.startsWith('/') ? path.replace('/', '') : `${path}`

    const mime: string = filename
      .substring(filename.lastIndexOf('.') + 1, filename.length)
      .toUpperCase()
    const key: string = path ? `${path}/${filename}` : filename

    const multiPartInput: CreateMultipartUploadCommandInput = {
      Bucket: bucket,
      Key: key,
      ACL: acl,
    }
    const multiPartCommand: CreateMultipartUploadCommand =
      new CreateMultipartUploadCommand(multiPartInput)

    try {
      const response = await this.s3Client.send(multiPartCommand)

      return {
        uploadId: response.UploadId as string,
        path: path as string,
        pathWithFilename: key,
        filename: filename,
        completedUrl: `${this.cdnUrl(bucket)}/${key}`,
        baseUrl: this.cdnUrl(bucket),
        mime,
        bucket,
        type: 'bitiful',
      }
    } catch (err: any) {
      throw err
    }
  }

  async uploadPart(
    path: string,
    content: UploadPartRequest['Body'] | string | Uint8Array | Buffer,
    uploadId: string,
    partNumber: number,
    bucket = this.bucket,
  ): Promise<BucketS3MultipartPartsSerialization> {
    const uploadPartInput: UploadPartCommandInput = {
      Bucket: bucket,
      Key: path,
      Body: content,
      PartNumber: partNumber,
      UploadId: uploadId,
    }
    const uploadPartCommand: UploadPartCommand = new UploadPartCommand(
      uploadPartInput,
    )

    try {
      const { ETag } = await this.s3Client.send(uploadPartCommand)

      return {
        ETag: ETag as string,
        PartNumber: partNumber,
      }
    } catch (err: any) {
      throw err
    }
  }

  async completeMultipart(
    path: string,
    uploadId: string,
    parts: CompletedPart[],
    bucket = this.bucket,
  ): Promise<void> {
    const completeMultipartInput: CompleteMultipartUploadCommandInput = {
      Bucket: bucket,
      Key: path,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    }

    const completeMultipartCommand: CompleteMultipartUploadCommand =
      new CompleteMultipartUploadCommand(completeMultipartInput)

    try {
      await this.s3Client.send(completeMultipartCommand)

      return
    } catch (err: any) {
      throw err
    }
  }

  async abortMultipart(
    path: string,
    uploadId: string,
    bucket = this.bucket,
  ): Promise<void> {
    const abortMultipartInput: AbortMultipartUploadCommandInput = {
      Bucket: bucket,
      Key: path,
      UploadId: uploadId,
    }

    const abortMultipartCommand: AbortMultipartUploadCommand =
      new AbortMultipartUploadCommand(abortMultipartInput)

    try {
      await this.s3Client.send(abortMultipartCommand)

      return
    } catch (err: any) {
      throw err
    }
  }
}
const BitifulS3Config: S3Config = {
  accessKeyId: process.env.BITIFUL_SECRET_KEY_ACCESS_KEY as string,
  secretAccessKey: process.env.BITIFUL_SECRET_KEY_SECRET_KEY as string,
  cdnUrl: process.env.BITIFUL_SECRET_KEY_CDN_URL as string,
  cdnUrl2: process.env.BITIFUL_SECRET_KEY_CDN_URL2 as string,
  region: process.env.BITIFUL_SECRET_KEY_REGION as string,
  endpoint: process.env.BITIFUL_SECRET_KEY_ENDPOINT as string,
}

export const bitifulS3 = new BucketService(BitifulS3Config)
