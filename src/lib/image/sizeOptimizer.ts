import type sharp from "sharp";
import { encodeToFormat, QUALITY_SEARCHABLE_FORMATS } from "./encode";
import type { OutputFormat } from "./types";

export interface EncodedAttempt {
  buffer: Buffer;
  quality: number;
  scale: number;
  width: number;
  height: number;
}

export interface SizeOptimizationResult {
  best: EncodedAttempt;
  satisfied: boolean;
  dimensionsReduced: boolean;
}

/**
 * Builds a fresh pipeline for a given downscale factor. `scale` of 1 means
 * "use the dimensions already requested by the user"; smaller values are
 * only used as a last resort when the target byte size is otherwise
 * unreachable at acceptable quality (see spec section 14/83).
 */
export type PipelineFactory = (scale: number) => sharp.Sharp;

async function encodeAt(
  factory: PipelineFactory,
  format: OutputFormat,
  scale: number,
  quality: number
): Promise<EncodedAttempt> {
  const pipeline = encodeToFormat(factory(scale), format, quality);
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { buffer: data, quality, scale, width: info.width, height: info.height };
}

/**
 * Bounded binary search over the encoder's quality parameter to find the
 * highest quality that still fits under `targetBytes`, instead of blindly
 * trying dozens of arbitrary quality values.
 */
async function searchQualityForScale(
  factory: PipelineFactory,
  format: OutputFormat,
  scale: number,
  targetBytes: number
): Promise<{ satisfying: EncodedAttempt | null; smallest: EncodedAttempt }> {
  let low = 1;
  let high = 100;
  let satisfying: EncodedAttempt | null = null;
  let smallest: EncodedAttempt | null = null;
  let iterations = 0;

  while (low <= high && iterations < 7) {
    const mid = Math.round((low + high) / 2);
    const attempt = await encodeAt(factory, format, scale, mid);
    iterations += 1;

    if (!smallest || attempt.buffer.length < smallest.buffer.length) smallest = attempt;

    if (attempt.buffer.length <= targetBytes) {
      if (!satisfying || attempt.quality > satisfying.quality) satisfying = attempt;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (!smallest) {
    smallest = await encodeAt(factory, format, scale, 1);
  }

  return { satisfying, smallest };
}

const DOWNSCALE_STEPS = [1, 0.85, 0.7, 0.55, 0.4];

export async function optimizeForTargetSize(
  factory: PipelineFactory,
  format: OutputFormat,
  targetBytes: number
): Promise<SizeOptimizationResult> {
  let fallback: EncodedAttempt | null = null;

  if (!QUALITY_SEARCHABLE_FORMATS.has(format)) {
    // No meaningful quality knob (e.g. GIF) — a single encode is all we can do
    // at each scale; fall back to dimension reduction if it's still too big.
    for (const scale of DOWNSCALE_STEPS) {
      const attempt = await encodeAt(factory, format, scale, 90);
      if (!fallback || attempt.buffer.length < fallback.buffer.length) fallback = attempt;
      if (attempt.buffer.length <= targetBytes) {
        return { best: attempt, satisfied: true, dimensionsReduced: scale !== 1 };
      }
    }
    return { best: fallback!, satisfied: false, dimensionsReduced: true };
  }

  for (const scale of DOWNSCALE_STEPS) {
    const { satisfying, smallest } = await searchQualityForScale(factory, format, scale, targetBytes);
    if (!fallback || smallest.buffer.length < fallback.buffer.length) fallback = smallest;
    if (satisfying) {
      return { best: satisfying, satisfied: true, dimensionsReduced: scale !== 1 };
    }
  }

  return { best: fallback!, satisfied: false, dimensionsReduced: true };
}
