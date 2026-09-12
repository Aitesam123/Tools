import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { ACCEPTED_INPUT_MIME_TYPES, LIMITS } from "./limits";

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export interface ValidatedImage {
  buffer: Buffer;
  mime: string;
  metadata: sharp.Metadata;
}

/**
 * Validates an uploaded file using its *actual* binary signature (magic
 * bytes) rather than trusting the filename extension or the browser-supplied
 * Content-Type, then decodes only its header/metadata (not full pixel data)
 * to check dimensions before any heavier processing happens.
 */
export async function validateUploadedImage(buffer: Buffer): Promise<ValidatedImage> {
  if (buffer.length === 0) {
    throw new ImageValidationError("The uploaded file is empty.");
  }
  if (buffer.length > LIMITS.maxUploadBytes) {
    const mb = (LIMITS.maxUploadBytes / (1024 * 1024)).toFixed(0);
    throw new ImageValidationError(`This file is too large. The limit is ${mb} MB.`);
  }

  // SVG is intentionally rejected as an *input* format: safely sanitizing
  // arbitrary SVG (script/event-handler/external-reference stripping) is a
  // security-sensitive problem we do not have a vetted sanitizer for in this
  // build, and rasterizing untrusted SVG without one is unsafe.
  const looksLikeSvg = buffer.slice(0, 2000).toString("utf8").includes("<svg");
  if (looksLikeSvg) {
    throw new ImageValidationError(
      "SVG uploads aren't supported yet: safely sanitizing arbitrary SVG requires tooling this build doesn't include."
    );
  }

  const sniffed = await fileTypeFromBuffer(buffer);
  if (!sniffed || !ACCEPTED_INPUT_MIME_TYPES.has(sniffed.mime)) {
    throw new ImageValidationError(
      "We couldn't recognize this as a supported image file. Supported: JPEG, PNG, WEBP, AVIF, TIFF, GIF, BMP."
    );
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer, {
      limitInputPixels: LIMITS.maxInputPixels,
      failOn: "error",
    }).metadata();
  } catch {
    throw new ImageValidationError(
      "This image appears to be corrupted or uses an unsupported encoding and could not be read."
    );
  }

  const { width = 0, height = 0 } = metadata;
  if (width <= 0 || height <= 0) {
    throw new ImageValidationError("This image has no readable dimensions.");
  }
  if (width * height > LIMITS.maxInputPixels) {
    const mp = (LIMITS.maxInputPixels / 1_000_000).toFixed(0);
    throw new ImageValidationError(
      `This image is too large (${width}×${height}). The limit is ${mp} megapixels.`
    );
  }

  return { buffer, mime: sniffed.mime, metadata };
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new ImageValidationError(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
