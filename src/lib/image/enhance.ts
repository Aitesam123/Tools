import type sharp from "sharp";
import type { ImageAnalysis } from "./analyze";
import type { CustomEnhancement, EnhancementMode } from "./types";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Applies real sharp/libvips operations chosen per-mode. Every mode uses
 * conservative parameter ranges specifically to avoid the classic failure
 * modes of naive "AI enhance" buttons: halos from oversharpening, plastic
 * skin from over-denoising, blown-out saturation, and loss of fine detail.
 */
export function applyEnhancement(
  pipeline: sharp.Sharp,
  mode: EnhancementMode,
  analysis: ImageAnalysis,
  custom: CustomEnhancement | undefined,
  isAnimated: boolean,
  minDimension: number
): string[] {
  const applied: string[] = [];
  // CLAHE's tile grid must be smaller than the image itself; guard against
  // tiny crops/thumbnails where an 8px tile wouldn't fit.
  const canUseClahe = minDimension >= 16;
  if (isAnimated) {
    // Spatial filters (median/clahe) operate on the whole joined animated
    // frame-strip in libvips; running them there can bleed pixels across
    // frame boundaries, so we skip enhancement for animated sources.
    return applied;
  }
  if (mode === "none") return applied;

  if (mode === "auto") {
    if (analysis.isLowContrast && canUseClahe) {
      pipeline.clahe({ width: 8, height: 8, maxSlope: 3 });
      applied.push("adaptive contrast");
    }
    if (analysis.isLikelyOverCompressed) {
      pipeline.median(3);
      applied.push("JPEG artifact smoothing");
    }
    const brightnessMul = analysis.meanBrightness < 90 ? 1.08 : analysis.meanBrightness > 175 ? 0.96 : 1.0;
    const saturationMul = analysis.meanSaturationProxy < 0.12 ? 1.12 : 1.0;
    pipeline.modulate({ brightness: brightnessMul, saturation: saturationMul });
    pipeline.sharpen({ sigma: 1.0 });
    applied.push("balanced sharpening");
    return applied;
  }

  if (mode === "natural") {
    pipeline.modulate({ saturation: 1.05 });
    pipeline.sharpen({ sigma: 0.6 });
    applied.push("subtle sharpening", "gentle saturation lift");
    return applied;
  }

  if (mode === "sharp") {
    if (canUseClahe) pipeline.clahe({ width: 8, height: 8, maxSlope: 2 });
    pipeline.sharpen({ sigma: 1.6, m1: 1.2, m2: 0.4 });
    applied.push("edge clarity boost");
    return applied;
  }

  if (mode === "detailed") {
    if (canUseClahe) pipeline.clahe({ width: 8, height: 8, maxSlope: 2.5 });
    pipeline.sharpen({ sigma: 1.2, m1: 0.8, m2: 0.9 });
    applied.push("local contrast + fine-detail sharpening");
    return applied;
  }

  if (mode === "portrait") {
    pipeline.median(3);
    pipeline.sharpen({ sigma: 0.5, m1: 0.5, m2: 0.2 });
    pipeline.modulate({ saturation: 1.03 });
    applied.push("light skin-safe denoise", "gentle sharpening");
    return applied;
  }

  if (mode === "product") {
    pipeline.normalise();
    if (canUseClahe) pipeline.clahe({ width: 8, height: 8, maxSlope: 2 });
    pipeline.sharpen({ sigma: 1.3 });
    pipeline.modulate({ saturation: 1.08 });
    pipeline.linear(1.08, -8);
    applied.push("white-balance normalization", "contrast + sharpness boost");
    return applied;
  }

  if (mode === "recovery") {
    pipeline.median(3);
    if (canUseClahe) pipeline.clahe({ width: 8, height: 8, maxSlope: 2 });
    pipeline.sharpen({ sigma: 1.0, m1: 0.6, m2: 0.3 });
    applied.push("compression-artifact smoothing", "detail recovery sharpening");
    return applied;
  }

  if (mode === "custom" && custom) {
    const brightnessMul = 1 + clamp(custom.brightness, -100, 100) / 200; // 0.5..1.5
    const saturationMul = 1 + clamp(custom.saturation, -100, 100) / 100; // 0..2
    pipeline.modulate({ brightness: brightnessMul, saturation: saturationMul });

    const contrastA = 1 + clamp(custom.contrast, -100, 100) / 125; // ~0.2..1.8
    pipeline.linear(contrastA, -(contrastA - 1) * 128);

    if (custom.exposure !== 0) {
      pipeline.linear(1, clamp(custom.exposure, -100, 100) * 0.3);
    }

    if (custom.denoise > 0) {
      const window = custom.denoise < 34 ? 3 : custom.denoise < 67 ? 5 : 7;
      pipeline.median(window);
    }

    if (custom.clarity > 0 && canUseClahe) {
      pipeline.clahe({ width: 8, height: 8, maxSlope: 1 + clamp(custom.clarity, 0, 100) / 25 });
    }

    if (custom.sharpness > 0) {
      const sigma = 0.3 + (clamp(custom.sharpness, 0, 100) / 100) * 2.7;
      pipeline.sharpen({ sigma });
    }

    applied.push("custom adjustments");
  }

  return applied;
}

/** Conventional (non-AI) upscaling using a high-quality Lanczos resampling kernel. */
export function computeUpscaledDimensions(
  width: number,
  height: number,
  factor: number
): { width: number; height: number } {
  return { width: Math.round(width * factor), height: Math.round(height * factor) };
}
