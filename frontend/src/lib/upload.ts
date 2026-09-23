import { api } from './api';
import axios from 'axios';

/**
 * Upload a file directly to S3 using a presigned URL.
 * The file goes straight from the browser to S3 — 0 MB server RAM, no timeout or crash.
 *
 * @param file - The file to upload
 * @param folder - S3 folder path (e.g. 'avatars', 'courses/123/30Days/General', 'materials')
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns The public S3 URL of the uploaded file
 */
export const uploadFileToS3 = async (
  file: File,
  folder: string,
  onProgress?: (progress: { percent: number; loaded: number; total: number }) => void
): Promise<{ url: string; key: string }> => {
  try {
    // 1. Get presigned upload URL from backend (fast 10ms call, 0 MB server RAM)
    const presignedRes = await api.post('/upload/presigned-url', {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      folder,
    });

    const { uploadUrl, publicUrl, key } = presignedRes.data.data;

    if (!uploadUrl || uploadUrl.includes('mock-s3-bucket')) {
      throw new Error('Presigned upload not available, fallback to direct server upload');
    }

    // 2. Upload directly from browser to Storage (0 EC2 RAM used!)
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress({ percent, loaded: progressEvent.loaded, total: progressEvent.total });
        }
      },
    });

    return { url: publicUrl || uploadUrl, key };
  } catch (err: any) {
    console.warn('[Direct S3 Upload Fallback]: Presigned upload error:', err?.message || err);
    // Fallback: If presigned URL fails or CORS blocks browser-to-S3 direct PUT, use direct server route
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const res = await api.post('/upload/direct', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress({ percent, loaded: progressEvent.loaded, total: progressEvent.total });
        }
      },
    });

    const { url, publicUrl, key } = res.data.data;
    return { url: publicUrl || url, key };
  }
};
