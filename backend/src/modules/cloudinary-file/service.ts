import { AbstractFileProviderService, MedusaError } from '@medusajs/framework/utils';
import { Logger } from '@medusajs/framework/types';
import {
  ProviderUploadFileDTO,
  ProviderDeleteFileDTO,
  ProviderFileResultDTO,
  ProviderGetFileDTO,
  ProviderGetPresignedUploadUrlDTO
} from '@medusajs/framework/types';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { ulid } from 'ulid';
import { Readable } from 'stream';
import https from 'https';
import http from 'http';

type InjectedDependencies = {
  logger: Logger
}

interface CloudinaryServiceConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
  folder?: string
  secure?: boolean
}

export interface CloudinaryFileProviderOptions {
  cloudName: string
  apiKey: string
  apiSecret: string
  folder?: string
  secure?: boolean
}

const DEFAULT_FOLDER = 'medusa-media'

/**
 * Service to handle file storage using Cloudinary.
 */
class CloudinaryFileProviderService extends AbstractFileProviderService {
  static identifier = 'cloudinary-file'
  protected readonly config_: CloudinaryServiceConfig
  protected readonly logger_: Logger
  protected readonly folder: string

  constructor({ logger }: InjectedDependencies, options: CloudinaryFileProviderOptions) {
    super()
    this.logger_ = logger
    this.config_ = {
      cloudName: options.cloudName,
      apiKey: options.apiKey,
      apiSecret: options.apiSecret,
      folder: options.folder || DEFAULT_FOLDER,
      secure: options.secure !== false // Default to true
    }

    // Use provided folder or default
    this.folder = this.config_.folder || DEFAULT_FOLDER
    this.logger_.info(`Cloudinary service initialized with folder: ${this.folder}`)

    // Initialize Cloudinary
    cloudinary.config({
      cloud_name: this.config_.cloudName,
      api_key: this.config_.apiKey,
      api_secret: this.config_.apiSecret,
      secure: this.config_.secure
    })

    this.logger_.info('Cloudinary client initialized successfully')
  }

  static validateOptions(options: Record<string, any>) {
    const requiredFields = [
      'cloudName',
      'apiKey',
      'apiSecret'
    ]

    requiredFields.forEach((field) => {
      if (!options[field]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `${field} is required in the provider's options`
        )
      }
    })
  }

  async upload(
    file: ProviderUploadFileDTO
  ): Promise<ProviderFileResultDTO> {
    if (!file) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file provided'
      )
    }

    if (!file.filename) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No filename provided'
      )
    }

    try {
      const parsedFilename = path.parse(file.filename)
      const fileKey = `${parsedFilename.name}-${ulid()}${parsedFilename.ext}`
      const content = Buffer.from(file.content, 'binary')

      // Convert buffer to base64 data URI for Cloudinary
      const base64Content = content.toString('base64')
      const dataUri = `data:${file.mimeType};base64,${base64Content}`

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: this.folder,
        public_id: fileKey.replace(parsedFilename.ext, ''), // Remove extension, Cloudinary handles it
        resource_type: 'auto', // Automatically detect image, video, etc.
        overwrite: false,
        unique_filename: true,
        use_filename: true,
        filename_override: fileKey
      })

      const url = uploadResult.secure_url || uploadResult.url

      this.logger_.info(`Successfully uploaded file ${fileKey} to Cloudinary folder ${this.folder}`)

      return {
        url,
        key: uploadResult.public_id // Use Cloudinary's public_id as the key
      }
    } catch (error: any) {
      this.logger_.error(`Failed to upload file: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to upload file: ${error.message}`
      )
    }
  }

  async delete(
    fileData: ProviderDeleteFileDTO | ProviderDeleteFileDTO[]
  ): Promise<void> {
    const files = Array.isArray(fileData) ? fileData : [fileData];

    for (const file of files) {
      if (!file?.fileKey) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'No file key provided'
        );
      }

      try {
        // Cloudinary public_id might include folder path, so we need to handle it
        const publicId = file.fileKey.includes('/') 
          ? file.fileKey 
          : `${this.folder}/${file.fileKey}`;

        await cloudinary.uploader.destroy(publicId);
        this.logger_.info(`Successfully deleted file ${publicId} from Cloudinary`);
      } catch (error: any) {
        this.logger_.warn(`Failed to delete file ${file.fileKey}: ${error.message}`);
      }
    }
  }

  async getPresignedDownloadUrl(
    fileData: ProviderGetFileDTO
  ): Promise<string> {
    if (!fileData?.fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file key provided'
      )
    }

    try {
      // Cloudinary URLs are already publicly accessible, but we can generate a signed URL
      const publicId = fileData.fileKey.includes('/') 
        ? fileData.fileKey 
        : `${this.folder}/${fileData.fileKey}`;

      // Generate a signed URL that expires (Cloudinary doesn't have expiration, but we can use signed URLs)
      const url = cloudinary.url(publicId, {
        secure: this.config_.secure,
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      })

      this.logger_.info(`Generated signed URL for file ${publicId}`)
      return url
    } catch (error: any) {
      this.logger_.error(`Failed to generate signed URL: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to generate signed URL: ${error.message}`
      )
    }
  }

  async getPresignedUploadUrl(
    fileData: ProviderGetPresignedUploadUrlDTO
  ): Promise<ProviderFileResultDTO> {
    if (!fileData?.filename) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No filename provided'
      )
    }

    try {
      // Cloudinary doesn't support presigned upload URLs in the same way as S3
      // Instead, we return a URL that can be used with Cloudinary's upload API
      // The actual upload will need to happen through the regular upload method
      const parsedFilename = path.parse(fileData.filename)
      const fileKey = `${parsedFilename.name}-${ulid()}${parsedFilename.ext}`

      // For Cloudinary, we'll return a placeholder URL
      // The actual upload should use the upload method
      const publicId = fileKey.replace(parsedFilename.ext, '')
      const url = cloudinary.url(`${this.folder}/${publicId}`, {
        secure: this.config_.secure
      })

      return {
        url,
        key: publicId
      }
    } catch (error: any) {
      this.logger_.error(`Failed to generate presigned upload URL: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to generate presigned upload URL: ${error.message}`
      )
    }
  }

  async getAsBuffer(fileData: ProviderGetFileDTO): Promise<Buffer> {
    if (!fileData?.fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file key provided'
      )
    }

    try {
      const publicId = fileData.fileKey.includes('/') 
        ? fileData.fileKey 
        : `${this.folder}/${fileData.fileKey}`;

      // Download the file from Cloudinary as a buffer
      const url = cloudinary.url(publicId, {
        secure: this.config_.secure
      })

      // Use Node.js built-in HTTP/HTTPS to fetch the file
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const client = url.startsWith('https') ? https : http
        client.get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to fetch file: ${response.statusCode} ${response.statusMessage}`))
            return
          }

          const chunks: Buffer[] = []
          response.on('data', (chunk: Buffer) => chunks.push(chunk))
          response.on('end', () => resolve(Buffer.concat(chunks)))
          response.on('error', reject)
        }).on('error', reject)
      })

      this.logger_.info(`Retrieved buffer for file ${publicId}`)
      return buffer
    } catch (error: any) {
      this.logger_.error(`Failed to get buffer: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to get buffer: ${error.message}`
      )
    }
  }

  async getDownloadStream(fileData: ProviderGetFileDTO): Promise<Readable> {
    if (!fileData?.fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file key provided'
      )
    }

    try {
      const publicId = fileData.fileKey.includes('/') 
        ? fileData.fileKey 
        : `${this.folder}/${fileData.fileKey}`;

      // Get the URL and create a readable stream
      const url = cloudinary.url(publicId, {
        secure: this.config_.secure
      })

      // Use Node.js built-in HTTP/HTTPS to create a readable stream
      const client = url.startsWith('https') ? https : http
      const stream = client.get(url, (response) => {
        if (response.statusCode !== 200) {
          stream.destroy()
          throw new Error(`Failed to fetch file: ${response.statusCode} ${response.statusMessage}`)
        }
      })

      this.logger_.info(`Retrieved download stream for file ${publicId}`)
      return stream as any as Readable
    } catch (error: any) {
      this.logger_.error(`Failed to get download stream: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to get download stream: ${error.message}`
      )
    }
  }
}

export default CloudinaryFileProviderService

