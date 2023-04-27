import { ObjectCannedACL } from '@aws-sdk/client-s3'

export interface UserProps {
  id: string
  name: string
  email: string
  role?: string
  createdAt?: Date
  usageProjectLimit?: number
  projects?: { projectId: string }[]
}

export interface ProjectProps {
  id: string
  name: string
  slug: string
  domain: string
  domainVerified: boolean
  logo?: string
  statsUsage: number
  statsUsageLimit: number
  statsExceededUsage: boolean
  staticUsage: number
  staticUsageLimit: number // 1024 * 1024kb
  staticExceededUsage: boolean
  tokenUsage: number
  tokenUsageLimit: number //1000token
  tokenExceededUsage: boolean

  users?: {
    role: string
  }[]
}

export interface S3Config {
  accessKeyId: string
  secretAccessKey: string
  cdnUrl: string
  region: string
  endpoint: string
  cdnUrl2?: string
}

export interface IBucketS3Response {
  path: string
  pathWithFilename: string
  filename: string
  completedUrl: string
  baseUrl: string
  mime?: string
}

export interface IBucketS3MultipartParts {
  ETag?: string
  PartNumber?: number
}

export interface IBucketS3MultipartResponse {
  uploadId: string
  partNumber?: number
  maxPartNumber?: number
  parts?: IBucketS3MultipartParts[]
}

export interface IBucketS3PutItemOptions {
  path: string
  ContentType?: string
  acl?: ObjectCannedACL
}

export enum IBucketS3Type {
  bitiful = 'bitiful',
  aliyun = 'aliyun',
}

export interface BucketS3Serialization {
  path: string

  pathWithFilename: string

  filename: string

  completedUrl: string

  baseUrl: string

  mime: string

  bucket?: string

  type?: string
}

export interface BucketS3MultipartPartsSerialization {
  ETag: string

  PartNumber: number
}

export interface BucketS3MultipartSerialization extends BucketS3Serialization {
  uploadId: string

  partNumber?: number

  maxPartNumber?: number

  parts?: BucketS3MultipartPartsSerialization[]
}

export type DomainVerificationStatusProps =
  | 'Valid Configuration'
  | 'Invalid Configuration'
  | 'Pending Verification'
  | 'Domain Not Found'
  | 'Unknown Error'

export interface UsageProps {
  usage: number
  usageLimit: number
  projectCount?: number
  billingCycleStart?: number
  ownerUsageLimit?: number
  ownerExceededUsage?: boolean
}
