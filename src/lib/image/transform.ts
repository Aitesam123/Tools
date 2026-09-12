import sharp from "sharp";
import type { CropRect, ResizeOptions, TransformOptions } from "./types";

/** EXIF orientation values 5-8 involve a 90/270 rotation, which swaps the effective width/height. */
export function effectiveDimensions(width: number, height: number, orientation?: number) {
  if (orientation && orientation >= 5 && orientation <= 8) {
    return { width: height, height: width };
  }
  return { width, height };
}

export function applyTransform(
  pipeline: sharp.Sharp,
  transform: TransformOptions,
  effectiveWidth: number,
  effectiveHeight: number,
  allowCrop: boolean
): { width: number; height: number } {
  // Auto-orient using embedded EXIF first, so all following geometry is in
  // "what the viewer sees" coordinates.
  pipeline.rotate();

  let width = effectiveWidth;
  let height = effectiveHeight;

  if (transform.crop && allowCrop) {
    const rect = clampCropToBounds(transform.crop, width, height);
    pipeline.extract(rect);
    width = rect.width;
    height = rect.height;
  }

  if (transform.rotate !== 0) {
    pipeline.rotate(transform.rotate);
    if (transform.rotate === 90 || transform.rotate === 270) {
      [width, height] = [height, width];
    }
  }
  if (transform.flipH) pipeline.flop();
  if (transform.flipV) pipeline.flip();

  return { width, height };
}

function clampCropToBounds(crop: CropRect, width: number, height: number) {
  const x = clamp01(crop.x);
  const y = clamp01(crop.y);
  const w = clamp01(crop.width);
  const h = clamp01(crop.height);

  const left = Math.round(x * width);
  const top = Math.round(y * height);
  const cropWidth = Math.max(1, Math.min(width - left, Math.round(w * width)));
  const cropHeight = Math.max(1, Math.min(height - top, Math.round(h * height)));

  return { left, top, width: cropWidth, height: cropHeight };
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

const RESIZE_FIT_MAP: Record<ResizeOptions["mode"], keyof sharp.FitEnum> = {
  fit: "inside",
  fill: "cover",
  exact: "fill",
  crop: "cover",
  contain: "contain",
};

export function applyResize(
  pipeline: sharp.Sharp,
  resize: ResizeOptions,
  maxOutputDimension: number
): void {
  if (!resize.width && !resize.height) return;

  const width = resize.width ? Math.min(resize.width, maxOutputDimension) : undefined;
  const height = resize.height ? Math.min(resize.height, maxOutputDimension) : undefined;

  const fit = RESIZE_FIT_MAP[resize.mode];
  const options: sharp.ResizeOptions = {
    fit,
    withoutEnlargement: false,
  };

  if (resize.mode === "crop") {
    options.position = sharp.strategy.attention; // smart, content-aware crop
  }
  if (resize.mode === "contain") {
    options.background = resize.background ?? "#ffffff";
  }

  pipeline.resize(width, height, options);
}
