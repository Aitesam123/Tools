/**
 * Hard safety limits. These exist to stop a single hostile or oversized
 * upload (decompression bombs, absurd dimensions) from exhausting server
 * memory or CPU. Tune via env vars in production.
 */
export const LIMITS = {
  /** Max bytes accepted for a single uploaded file. */
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 45 * 1024 * 1024),
  /** Max total pixels (width * height) allowed for a decoded source image. */
  maxInputPixels: Number(process.env.MAX_INPUT_PIXELS ?? 60_000_000), // ~60MP
  /** Max width or height accepted for the *output* request. */
  maxOutputDimension: Number(process.env.MAX_OUTPUT_DIMENSION ?? 8000),
  /** Max number of files accepted in a single batch request. */
  maxBatchFiles: Number(process.env.MAX_BATCH_FILES ?? 30),
  /** Wall-clock timeout (ms) for processing a single image. */
  processingTimeoutMs: Number(process.env.PROCESSING_TIMEOUT_MS ?? 30_000),
  /** Requests allowed per IP per window for processing endpoints. */
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    maxRequests: Number(process.env.RATE_LIMIT_MAX ?? 40),
  },
} as const;

export const ACCEPTED_INPUT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/tiff",
  "image/gif",
  "image/bmp",
]);
