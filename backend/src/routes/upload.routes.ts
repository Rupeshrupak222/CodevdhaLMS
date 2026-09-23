import { Router } from 'express';
import { getPresignedUploadUrl, resolveS3Url, checkS3ObjectExists, uploadToS3 } from '../utils/s3';
import { authenticate } from '../middlewares/authenticate';
import { uploadLimiter } from '../middlewares/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/apiError';
import { env } from '../config/env';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';
import http from 'http';
import multer from 'multer';

import path from 'path';

const tempUploadDir = path.join(process.cwd(), 'uploads_temp');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const uploadDisk = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, tempUploadDir),
    filename: (req, file, cb) => cb(null, `upload_${Date.now()}_${uuidv4().substring(0, 8)}`),
  }),
  limits: { fileSize: 2000 * 1024 * 1024 }, // 2 GB limit
});

const router = Router();

// ── Allowed MIME types (whitelist) ──────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Videos
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
  'application/octet-stream',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-tar',
]);

// ── Blocked file extensions (defense-in-depth) ──────────────────────────────
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll',
  '.html', '.htm', '.svg', '.xml', '.php', '.jsp', '.asp',
  '.js', '.ts', '.py', '.rb', '.pl', '.cgi',
]);

// All upload routes require authentication
router.use(authenticate);
router.use(uploadLimiter);

// ── Direct Server Upload (Bypasses Browser CORS / Preflight) ─────────────────
router.post(
  '/direct',
  uploadDisk.single('file'),
  asyncHandler(async (req, res) => {
    const file = req.file;
    const folder = req.body.folder || 'misc';

    if (!file) {
      throw AppError.badRequest('No file provided');
    }

    try {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw AppError.badRequest(`File type '${file.mimetype}' is not allowed`);
      }

      const ext = file.originalname.includes('.')
        ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase()
        : '';
      if (ext && BLOCKED_EXTENSIONS.has(ext)) {
        throw AppError.badRequest(`File extension '${ext}' is not allowed`);
      }

      const sanitizedFolder = (folder || 'misc')
        .replace(/[^a-zA-Z0-9_\-\/\s]/g, '')
        .replace(/\/+/g, '/')
        .replace(/^\/|\/$/g, '');

      const baseName = file.originalname.includes('.')
        ? file.originalname.substring(0, file.originalname.lastIndexOf('.'))
        : file.originalname;

      const sanitizedName = baseName
        .replace(/[^a-zA-Z0-9_\-\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 100);

      const uniqueName = `${sanitizedName}_${uuidv4().substring(0, 8)}${ext}`;
      const key = `${sanitizedFolder}/${uniqueName}`;

      const stream = fs.createReadStream(file.path);
      const { url } = await uploadToS3(stream, key, file.mimetype);

      return sendSuccess(res, {
        message: 'File uploaded successfully',
        data: {
          uploadUrl: url,
          publicUrl: url,
          url,
          key,
          fileName: uniqueName,
        },
      });
    } finally {
      // Clean up local temp file
      if (file && file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch {}
      }
    }
  })
);

// ── Get Presigned Upload URL ─────────────────────────────────────────────────
// Frontend calls this to get a URL, then uploads directly to S3.
// No file size limit from the server — supports large videos (2GB+).
router.post(
  '/presigned-url',
  asyncHandler(async (req, res) => {
    const { fileName, contentType, folder } = req.body;

    if (!fileName || !contentType) {
      throw AppError.badRequest('Missing required fields: fileName, contentType');
    }

    // Validate content type
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      throw AppError.badRequest(`File type '${contentType}' is not allowed`);
    }

    // Validate extension
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw AppError.badRequest(`File extension '${ext}' is not allowed`);
    }

    // Build the S3 key based on folder structure
    // Sanitize folder — allow slashes for nested paths like courses/30Days/General
    const sanitizedFolder = (folder || 'misc')
      .replace(/[^a-zA-Z0-9_\-\/\s]/g, '')
      .replace(/\/+/g, '/')
      .replace(/^\/|\/$/g, '');

    // Sanitize filename: keep original name but make it URL-safe
    const sanitizedName = fileName
      .substring(0, fileName.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100); // limit length

    const uniqueName = `${sanitizedName}_${uuidv4().substring(0, 8)}${ext}`;
    const key = `${sanitizedFolder}/${uniqueName}`;

    const result = await getPresignedUploadUrl(key, contentType);

    return sendSuccess(res, {
      message: 'Presigned upload URL generated',
      data: {
        uploadUrl: result.uploadUrl,
        key: result.key,
        publicUrl: result.publicUrl,
        fileName: uniqueName,
      },
    });
  })
);

// ── Resolve S3 URL → presigned download URL ─────────────────────────────────
// Accepts an S3 URL or key, returns a presigned URL for download/playback
router.post(
  '/resolve-url',
  asyncHandler(async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      throw AppError.badRequest('Missing or invalid "url" field');
    }

    const trimmed = url.trim();
    if (!trimmed) {
      throw AppError.badRequest('URL cannot be empty');
    }

    // Extract the S3/Bunny key from URL
    let s3Key = trimmed;
    if (trimmed.startsWith('http') && (trimmed.includes('amazonaws.com') || trimmed.includes('bunnycdn.com') || trimmed.includes('b-cdn.net'))) {
      try {
        const parsed = new URL(trimmed);
        s3Key = decodeURIComponent(parsed.pathname.substring(1).replace(/\+/g, ' '));
        if (env.AWS_S3_BUCKET && s3Key.startsWith(`${env.AWS_S3_BUCKET}/`)) {
          s3Key = s3Key.replace(`${env.AWS_S3_BUCKET}/`, '');
        }
      } catch {
        s3Key = trimmed.replace(/\+/g, ' ');
      }
    } else {
      s3Key = s3Key.replace(/\+/g, ' ');
    }

    const presignedUrl = await resolveS3Url(trimmed);
    if (!presignedUrl) {
      throw AppError.badRequest('Could not generate presigned URL');
    }

    return sendSuccess(res, {
      message: 'URL resolved successfully',
      data: {
        originalUrl: trimmed,
        presignedUrl,
        s3Key,
      },
    });
  })
);

// ── Secure Video Stream Proxy ────────────────────────────────────────────────
router.post(
  '/video-stream-token',
  asyncHandler(async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      throw AppError.badRequest('Missing or invalid "url" field');
    }

    const trimmed = url.trim();
    if (!trimmed) {
      throw AppError.badRequest('URL cannot be empty');
    }

    let s3Key = trimmed;
    if (trimmed.startsWith('http') && trimmed.includes('amazonaws.com')) {
      try {
        const parsed = new URL(trimmed);
        s3Key = decodeURIComponent(parsed.pathname.substring(1).replace(/\+/g, ' '));
      } catch {
        s3Key = trimmed.replace(/\+/g, ' ');
      }
    } else {
      s3Key = s3Key.replace(/\+/g, ' ');
    }

    const exists = await checkS3ObjectExists(s3Key);
    if (!exists) {
      throw AppError.badRequest('Video file not found');
    }

    const presignedUrl = await resolveS3Url(trimmed);
    if (!presignedUrl) {
      throw AppError.badRequest('Could not generate stream URL');
    }

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    });

    return sendSuccess(res, {
      message: 'Stream token generated',
      data: {
        streamUrl: presignedUrl,
        expiresIn: 21600, // 6 hours
      },
    });
  })
);

// ── Video Proxy Stream ───────────────────────────────────────────────────────
router.post(
  '/video-proxy',
  asyncHandler(async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      throw AppError.badRequest('Missing or invalid "url" field');
    }

    const trimmed = url.trim();
    if (!trimmed) throw AppError.badRequest('URL cannot be empty');

    let s3Key = trimmed;
    if (trimmed.startsWith('http') && trimmed.includes('amazonaws.com')) {
      try {
        const parsed = new URL(trimmed);
        s3Key = decodeURIComponent(parsed.pathname.substring(1).replace(/\+/g, ' '));
      } catch { s3Key = trimmed.replace(/\+/g, ' '); }
    } else {
      s3Key = s3Key.replace(/\+/g, ' ');
    }

    const exists = await checkS3ObjectExists(s3Key);
    if (!exists) throw AppError.badRequest('Video not found');

    const presignedUrl = await resolveS3Url(trimmed);
    if (!presignedUrl) throw AppError.badRequest('Could not resolve video URL');

    res.set({
      'Content-Type': 'video/mp4',
      'Content-Disposition': 'inline',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    });

    const parsedUrl = new URL(presignedUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    client.get(presignedUrl, (s3Res) => {
      if (s3Res.headers['content-length']) {
        res.set('Content-Length', s3Res.headers['content-length']);
      }
      s3Res.pipe(res);
    }).on('error', (err) => {
      console.error('Video proxy error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to stream video' });
      }
    });
  })
);

export default router;
