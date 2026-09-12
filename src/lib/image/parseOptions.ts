import { isFormatSupported } from "./formats";
import { LIMITS } from "./limits";
import type {
  CustomEnhancement,
  EnhancementMode,
  MetadataMode,
  ProcessRequestOptions,
  ResizeMode,
  SizeUnit,
} from "./types";

const ENHANCEMENT_MODES: EnhancementMode[] = [
  "none",
  "auto",
  "natural",
  "sharp",
  "detailed",
  "portrait",
  "product",
  "recovery",
  "custom",
];
const RESIZE_MODES: ResizeMode[] = ["fit", "fill", "exact", "crop", "contain"];
const UPSCALE_FACTORS = [1, 1.5, 2, 3, 4];

class OptionsValidationError extends Error {}

function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
}

function clampCustom(raw: unknown): CustomEnhancement {
  const c = (raw ?? {}) as Partial<CustomEnhancement>;
  return {
    sharpness: num(c.sharpness, 0, 0, 100),
    clarity: num(c.clarity, 0, 0, 100),
    contrast: num(c.contrast, 0, -100, 100),
    brightness: num(c.brightness, 0, -100, 100),
    saturation: num(c.saturation, 0, -100, 100),
    exposure: num(c.exposure, 0, -100, 100),
    denoise: num(c.denoise, 0, 0, 100),
  };
}

/** Parses and clamps untrusted client JSON into safe, bounded processing options. */
export function parseProcessOptions(raw: unknown): ProcessRequestOptions {
  if (typeof raw !== "object" || raw === null) {
    throw new OptionsValidationError("Missing processing options.");
  }
  const body = raw as Record<string, unknown>;

  const enhancementRaw = (body.enhancement ?? {}) as Record<string, unknown>;
  const mode = ENHANCEMENT_MODES.includes(enhancementRaw.mode as EnhancementMode)
    ? (enhancementRaw.mode as EnhancementMode)
    : "none";
  const upscaleRaw = Number(enhancementRaw.upscale ?? 1);
  const upscale = (UPSCALE_FACTORS.includes(upscaleRaw as never) ? upscaleRaw : 1) as
    | 1
    | 1.5
    | 2
    | 3
    | 4;

  const transformRaw = (body.transform ?? {}) as Record<string, unknown>;
  const rotateRaw = Number(transformRaw.rotate ?? 0);
  const rotate = ([0, 90, 180, 270].includes(rotateRaw) ? rotateRaw : 0) as 0 | 90 | 180 | 270;
  let crop = null as ProcessRequestOptions["transform"]["crop"];
  if (transformRaw.crop && typeof transformRaw.crop === "object") {
    const c = transformRaw.crop as Record<string, unknown>;
    crop = {
      x: num(c.x, 0, 0, 1),
      y: num(c.y, 0, 0, 1),
      width: num(c.width, 1, 0.01, 1),
      height: num(c.height, 1, 0.01, 1),
    };
  }

  const resizeRaw = (body.resize ?? {}) as Record<string, unknown>;
  const resizeMode = RESIZE_MODES.includes(resizeRaw.mode as ResizeMode)
    ? (resizeRaw.mode as ResizeMode)
    : "fit";
  const width = resizeRaw.width ? num(resizeRaw.width, 0, 1, LIMITS.maxOutputDimension) : undefined;
  const height = resizeRaw.height ? num(resizeRaw.height, 0, 1, LIMITS.maxOutputDimension) : undefined;
  const isHexColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
  const resizeBackground = isHexColor(resizeRaw.background) ? resizeRaw.background : undefined;

  const formatRaw = (body.format ?? {}) as Record<string, unknown>;
  const target = String(formatRaw.target ?? "");
  if (!isFormatSupported(target)) {
    throw new OptionsValidationError(`Output format "${target}" isn't supported.`);
  }
  const formatBackground = isHexColor(formatRaw.background) ? formatRaw.background : undefined;

  let targetSize: ProcessRequestOptions["targetSize"] = null;
  if (body.targetSize && typeof body.targetSize === "object") {
    const ts = body.targetSize as Record<string, unknown>;
    const value = Number(ts.value);
    const unit: SizeUnit = ts.unit === "MB" ? "MB" : "KB";
    if (Number.isFinite(value) && value > 0) {
      targetSize = { value: Math.min(value, unit === "MB" ? 200 : 200000), unit };
    }
  }

  const metadata: MetadataMode = body.metadata === "preserve" ? "preserve" : "strip";

  return {
    enhancement: { mode, upscale, custom: mode === "custom" ? clampCustom(enhancementRaw.custom) : undefined },
    transform: {
      rotate,
      flipH: Boolean(transformRaw.flipH),
      flipV: Boolean(transformRaw.flipV),
      crop,
    },
    resize: { width, height, mode: resizeMode, background: resizeBackground },
    format: { target, background: formatBackground },
    targetSize,
    metadata,
  };
}

export { OptionsValidationError };
