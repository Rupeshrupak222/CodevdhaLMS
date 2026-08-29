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
  // Step 1: Get presigned upload URL from backend
  const presignedRes = await api.post('/upload/presigned-url', {
    fileName: file.name,
    contentType: file.type,
    folder,
  });

  const { uploadUrl, publicUrl, key } = presignedRes.data.data;

  // Step 2: Upload file directly to S3
  // Use XMLHttpRequest for progress tracking (fetch doesn't support upload progress)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress({ percent, loaded: event.loaded, total: event.total });
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed due to network error'));
    xhr.onabort = () => reject(new Error('Upload was cancelled'));

    xhr.send(file);
  });

  return { url: publicUrl, key };
};
