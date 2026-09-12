import sharp from "sharp";
import type { OutputFormat } from "./types";

const CANDIDATE_FORMATS: OutputFormat[] = ["jpeg", "png", "webp", "avif", "tiff", "gif"];

export interface FormatCapability {
  format: OutputFormat;
  label: string;
  mime: string;
  supportsAlpha: boolean;
  supportsAnimation: boolean;
}

const META: Record<OutputFormat, Omit<FormatCapability, "format">> = {
  jpeg: { label: "JPEG", mime: "image/jpeg", supportsAlpha: false, supportsAnimation: false },
  png: { label: "PNG", mime: "image/png", supportsAlpha: true, supportsAnimation: false },
  webp: { label: "WEBP", mime: "image/webp", supportsAlpha: true, supportsAnimation: true },
  avif: { label: "AVIF", mime: "image/avif", supportsAlpha: true, supportsAnimation: false },
  tiff: { label: "TIFF", mime: "image/tiff", supportsAlpha: true, supportsAnimation: false },
  gif: { label: "GIF", mime: "image/gif", supportsAlpha: true, supportsAnimation: true },
};

let cachedCapabilities: FormatCapability[] | null = null;

/**
 * Asks the actual installed libvips/sharp binary which formats it can
 * genuinely *encode*, instead of hardcoding a wishlist. This is what the UI
 * uses to decide which conversions to offer, so we never advertise a
 * conversion the underlying engine can't perform.
 */
// sharp exposes AVIF encoding capability under the "heif" format entry
// (AVIF is a HEIF-family container using the AV1 codec), not under a
// top-level "avif" key — so we probe that key specifically for it.
const PROBE_KEY: Partial<Record<OutputFormat, string>> = { avif: "heif" };

export function getOutputCapabilities(): FormatCapability[] {
  if (cachedCapabilities) return cachedCapabilities;

  const support = sharp.format as unknown as Record<string, { output?: { buffer?: boolean } } | undefined>;
  cachedCapabilities = CANDIDATE_FORMATS.filter((fmt) => {
    const info = support[PROBE_KEY[fmt] ?? fmt];
    return Boolean(info?.output?.buffer);
  }).map((format) => ({ format, ...META[format] }));

  return cachedCapabilities;
}

export function isFormatSupported(format: string): format is OutputFormat {
  return getOutputCapabilities().some((f) => f.format === format);
}

export interface FormatRecommendation {
  reason: string;
  formats: OutputFormat[];
}

/** Section 4: recommend formats based on real image characteristics, never hardcoded blindly. */
export function recommendFormats(input: {
  hasAlpha: boolean;
  isPhotographic: boolean;
  isAnimated: boolean;
}): FormatRecommendation {
  const supported = new Set(getOutputCapabilities().map((f) => f.format));
  const pick = (candidates: OutputFormat[]) => candidates.filter((f) => supported.has(f));

  if (input.isAnimated) {
    return { reason: "Animated image", formats: pick(["gif", "webp"]) };
  }
  if (input.hasAlpha) {
    return { reason: "Contains transparency", formats: pick(["webp", "avif", "png"]) };
  }
  if (input.isPhotographic) {
    return { reason: "Photographic content", formats: pick(["avif", "webp", "jpeg"]) };
  }
  return { reason: "Maximum compatibility", formats: pick(["jpeg", "png"]) };
}
