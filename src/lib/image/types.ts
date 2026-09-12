export type OutputFormat = "jpeg" | "png" | "webp" | "avif" | "tiff" | "gif";

export type EnhancementMode =
  | "none"
  | "auto"
  | "natural"
  | "sharp"
  | "detailed"
  | "portrait"
  | "product"
  | "recovery"
  | "custom";

export type ResizeMode = "fit" | "fill" | "exact" | "crop" | "contain";

export type MetadataMode = "preserve" | "strip";

export type SizeUnit = "KB" | "MB";

export interface CustomEnhancement {
  sharpness: number; // 0-100
  clarity: number; // 0-100
  contrast: number; // -100..100
  brightness: number; // -100..100
  saturation: number; // -100..100
  exposure: number; // -100..100
  denoise: number; // 0-100
}

export interface CropRect {
  /** all fractions 0..1 relative to the (already auto-oriented) source image */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformOptions {
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  crop?: CropRect | null;
}

export interface ResizeOptions {
  width?: number | null;
  height?: number | null;
  mode: ResizeMode;
  background?: string; // used by 'contain'
}

export interface EnhancementOptions {
  mode: EnhancementMode;
  upscale?: 1 | 1.5 | 2 | 3 | 4;
  custom?: CustomEnhancement;
}

export interface FormatOptions {
  target: OutputFormat;
  background?: string; // used when alpha must be flattened (e.g. -> JPEG)
}

export interface TargetSize {
  value: number;
  unit: SizeUnit;
}

export interface ProcessRequestOptions {
  enhancement: EnhancementOptions;
  transform: TransformOptions;
  resize: ResizeOptions;
  format: FormatOptions;
  targetSize?: TargetSize | null;
  metadata: MetadataMode;
}

export interface ImageSummary {
  filename: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  hasAlpha: boolean;
  isAnimated: boolean;
}

export interface ProcessResult {
  original: ImageSummary;
  final: ImageSummary;
  warnings: string[];
  targetSizeStatus?: {
    requestedBytes: number;
    achievedBytes: number;
    satisfied: boolean;
    dimensionsReduced: boolean;
  };
  recommendedFormats: OutputFormat[];
}
