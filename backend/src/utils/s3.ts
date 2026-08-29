import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

const isS3Configured = () => {
  return (
    env.AWS_ACCESS_KEY_ID &&
    env.AWS_ACCESS_KEY_ID !== 'your_key' &&
    env.AWS_SECRET_ACCESS_KEY &&
    env.AWS_SECRET_ACCESS_KEY !== 'your_secret' &&
    env.AWS_S3_BUCKET &&
    env.AWS_S3_BUCKET !== 'codvedha-lms-dev'
  );
};

let s3Client: S3Client | null = null;
if (isS3Configured()) {
  s3Client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
} else {
  if (env.isProd) {
    console.error('🚨 CRITICAL: AWS S3 is NOT configured in production! File uploads will use data URLs (not suitable for production).');
  } else {
    console.warn('⚠️ AWS S3 is not configured. Running file uploads in fallback/mock mode.');
  }
}

export const uploadToS3 = async (
  fileBuffer: Buffer,
  key: string,
  mimeType: string
): Promise<{ url: string; key: string }> => {
  if (!s3Client) {
    // Fallback: Return a data URL for development so images render properly
    console.log(`[Mock Upload] Uploading to S3: Key=${key}, MimeType=${mimeType}`);
    const mockUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    return { url: mockUrl, key };
  }

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);
  const url = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  return { url, key };
};

export const getPresignedDownloadUrl = async (key: string): Promise<string> => {
  if (!s3Client || !key) {
    // Fallback: return dummy url or placeholder
    return `https://mock-s3-bucket.s3.amazonaws.com/${key}`;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 21600 }); // 6 hours — allows full video playback regardless of length
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  }
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  if (!s3Client || !key) {
    console.log(`[Mock Delete] Deleting S3 Key: ${key}`);
    return;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
    });
    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting from S3:', error);
  }
};

export const resolveS3Url = async (urlOrKey: string | null | undefined): Promise<string | null> => {
  if (!urlOrKey) return null;
  
  // Return early for data URLs
  if (urlOrKey.startsWith('data:')) return urlOrKey;
  
  // Return early for non-S3 external URLs
  if (urlOrKey.startsWith('http') && !urlOrKey.includes('amazonaws.com') && !urlOrKey.includes('mock-s3-bucket')) {
    return urlOrKey;
  }

  let key = urlOrKey;
  try {
    if (urlOrKey.startsWith('http')) {
      const url = new URL(urlOrKey);
      key = decodeURIComponent(url.pathname.substring(1));
    }
    // Try literal key first; if it has '+' and fails, try with '+' as space
    const exists = await checkS3ObjectExists(key);
    if (!exists && key.includes('+')) {
      const keyWithSpaces = key.replace(/\+/g, ' ');
      const existsWithSpaces = await checkS3ObjectExists(keyWithSpaces);
      if (existsWithSpaces) {
        key = keyWithSpaces;
      }
    }
    return await getPresignedDownloadUrl(key);
  } catch {
    return urlOrKey;
  }
};

export const stripPresignedParams = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (!url.includes('amazonaws.com')) return url;
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
};


export const checkS3ObjectExists = async (key: string): Promise<boolean> => {
  if (!s3Client || !key) return false;
  try {
    const command = new HeadObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
};

/**
 * Generate a presigned URL for direct browser-to-S3 upload.
 * The frontend uploads directly to S3 using this URL — no file passes through the backend.
 * Supports any file size (no server memory limit).
 */
export const getPresignedUploadUrl = async (
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> => {
  if (!s3Client) {
    // Fallback for dev without S3 configured
    console.log(`[Mock Presigned Upload] Key=${key}, ContentType=${contentType}`);
    return {
      uploadUrl: `https://mock-s3-bucket.s3.amazonaws.com/${key}?mock=true`,
      key,
      publicUrl: `https://mock-s3-bucket.s3.amazonaws.com/${key}`,
    };
  }

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  const publicUrl = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, key, publicUrl };
};
