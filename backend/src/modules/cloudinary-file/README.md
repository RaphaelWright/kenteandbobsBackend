# Cloudinary File Provider Module

This module provides Cloudinary integration for file storage in Medusa. It implements the file provider interface to handle file uploads, downloads, and deletions using Cloudinary as the storage backend.

## Configuration

The module requires the following environment variables:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=medusa-media  # Optional, defaults to 'medusa-media'
```

## Features

- Automatic folder organization (default: 'medusa-media')
- Unique file naming using ULID
- Proper content type and metadata handling
- Automatic image optimization and transformation support
- CDN delivery for fast global access
- Support for images, videos, and other media types

## Usage

The module is automatically configured in medusa-config.js when the required environment variables are present:

```javascript
{
  resolve: './src/modules/cloudinary-file',
  id: 'cloudinary',
  options: {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    apiSecret: CLOUDINARY_API_SECRET,
    folder: CLOUDINARY_FOLDER  // Optional, defaults to 'medusa-media'
  }
}
```

### Important Note About Configuration Changes

When changing configuration (especially the folder name):
1. Stop the Medusa server
2. Delete the `.medusa/server` directory to clear cached configuration
3. Restart the server

This is necessary because Medusa caches environment variables in the `.medusa/server` directory.

### File Upload

Files are automatically uploaded to Cloudinary when using Medusa's file upload endpoints or services. Each file is stored with:
- A unique name generated using ULID
- The original file extension preserved
- Proper content type set
- Organized in the specified folder (default: 'medusa-media')
- Automatic optimization enabled

### File Access

Files can be accessed via Cloudinary URLs:
- Direct URL: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${FOLDER}/${fileKey}`
- Files are publicly accessible by default
- You can add transformations to URLs for on-the-fly image manipulation

### Image Transformations

Cloudinary supports powerful on-the-fly image transformations. You can modify the URLs returned by Medusa to add transformations:

- **Resize:** Add `w_500,h_500` to resize to 500x500
- **Crop:** Add `c_fill,w_300,h_300` to fill crop
- **Quality:** Add `q_auto` for automatic quality optimization
- **Format:** Add `f_auto` for automatic format selection

Example:
```
Original: https://res.cloudinary.com/cloud/image/upload/medusa-media/image.jpg
Resized:  https://res.cloudinary.com/cloud/image/upload/w_500,h_500/medusa-media/image.jpg
```

### File Deletion

Files are automatically deleted from Cloudinary when using Medusa's file deletion endpoints or services.

## Implementation Details

- Files are uploaded with unique names using ULID to prevent collisions
- Original filenames are preserved in Cloudinary metadata
- Non-existent file deletions are logged but don't throw errors
- Secure URLs are used by default (HTTPS)
- Files are organized in folders for better management

## Security Considerations

- Cloudinary URLs are publicly accessible by default
- This is suitable for public assets like product images
- For private files, consider using Cloudinary's signed URLs or access control features
- API keys and secrets should never be committed to version control

## Getting Cloudinary Credentials

1. Sign up at [cloudinary.com](https://cloudinary.com/)
2. Go to your Dashboard
3. Find your:
   - **Cloud Name** (at the top of the dashboard)
   - **API Key** (in the dashboard)
   - **API Secret** (click "Reveal" to see it)

## Troubleshooting

1. **Files not uploading**: 
   - Verify your Cloudinary credentials are correct
   - Check that your API key has upload permissions
   - Ensure you have sufficient quota in your Cloudinary plan

2. **Configuration not working**:
   - Delete the `.medusa/server` directory to clear cached configuration
   - Restart the server
   - Check server logs for initialization messages

3. **Files not accessible**:
   - Verify the URLs are using HTTPS (secure: true by default)
   - Check that files were uploaded successfully in Cloudinary dashboard
   - Ensure your Cloudinary account is active

## Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Image Transformations](https://cloudinary.com/documentation/image_transformations)
- [Medusa File Provider Docs](https://docs.medusajs.com/resources/references/file-provider-module)

