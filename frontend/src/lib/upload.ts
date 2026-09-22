import { api } from './api';

/**
 * Upload a file directly to S3 using a presigned URL.
 * The file goes straight from the browser to S3 — no server memory limit.
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
};
