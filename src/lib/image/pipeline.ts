import sharp from "sharp";
import { analyzeImage } from "./analyze";
import { applyEnhancement, computeUpscaledDimensions } from "./enhance";
import { applyTransform, applyResize, effectiveDimensions } from "./transform";
import { optimizeForTargetSize, type PipelineFactory } from "./sizeOptimizer";
import { encodeToFormat } from "./encode";
import { getOutputCapabilities, recommendFormats } from "./formats";
import { LIMITS } from "./limits";
import { buildOutputFilename } from "./filename";
import type { ImageSummary, ProcessRequestOptions, ProcessResult } from "./types";
import type { ValidatedImage } from "./validate";

export interface PipelineOutput {
  buffer: Buffer;
  filename: string;
  mime: string;
  result: ProcessResult;
}

function targetBytes(options: ProcessRequestOptions["targetSize"]): number | null {
  if (!options || !options.value || options.value <= 0) return null;
  return Math.round(options.unit === "MB" ? options.value * 1024 * 1024 : options.value * 1024);
}

export async function runPipeline(
  validated: ValidatedImage,
  originalFilename: string,
  options: ProcessRequestOptions
): Promise<PipelineOutput> {
  const { buffer, metadata } = validated;
  const capabilities = getOutputCapabilities();
  const targetCap = capabilities.find((c) => c.format === options.format.target);
  if (!targetCap) {
    throw new Error(`Output format "${options.format.target}" isn't supported by this server's image engine.`);
  }

  const sourceIsAnimated = (metadata.pages ?? 1) > 1;
  const wantsAnimatedOutput = sourceIsAnimated && targetCap.supportsAnimation;
  const warnings: string[] = [];

  if (sourceIsAnimated && !targetCap.supportsAnimation) {
    warnings.push(
      `The source image is animated, but ${targetCap.label} doesn't support animation — only the first frame was converted.`
    );
  }
  const cropRequestedButBlocked = Boolean(options.transform.crop) && wantsAnimatedOutput;
  if (cropRequestedButBlocked) {
    warnings.push("Cropping isn't applied to animated images to keep every frame aligned.");
  }

  const decode = () =>
    sharp(buffer, {
      limitInputPixels: LIMITS.maxInputPixels,
      animated: wantsAnimatedOutput,
      failOn: "error",
    });

  const base = decode();
  const analysis = await analyzeImage(base, metadata);
  const { width: effW, height: effH } = effectiveDimensions(
    metadata.width ?? 0,
    metadata.height ?? 0,
    metadata.orientation
  );

  const originalSummary: ImageSummary = {
    filename: originalFilename,
    format: metadata.format ?? "unknown",
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    bytes: buffer.length,
    hasAlpha: Boolean(metadata.hasAlpha),
    isAnimated: sourceIsAnimated,
  };

  /**
   * Builds a fresh, independent pipeline for a given downscale `scale`
   * (used by the size optimizer to retry at reduced dimensions). Everything
   * up to (but not including) format encoding happens here, from the
   * original source buffer, so repeated attempts never re-compress an
   * already-compressed intermediate.
   */
  const factory: PipelineFactory = (scale: number) => {
    const p = decode();
    const { width: postTransformW, height: postTransformH } = applyTransform(
      p,
      options.transform,
      effW,
      effH,
      !wantsAnimatedOutput
    );

    let currentW = postTransformW;
    let currentH = postTransformH;

    applyEnhancement(
      p,
      options.enhancement.mode,
      analysis,
      options.enhancement.custom,
      wantsAnimatedOutput,
      Math.min(currentW, currentH)
    );

    const upscaleFactor = options.enhancement.upscale ?? 1;
    const noExplicitResize = !options.resize.width && !options.resize.height;
    if (upscaleFactor > 1 && noExplicitResize && !wantsAnimatedOutput) {
      const upscaled = computeUpscaledDimensions(currentW, currentH, upscaleFactor);
      const cappedWidth = Math.min(upscaled.width, LIMITS.maxOutputDimension);
      const cappedHeight = Math.min(upscaled.height, LIMITS.maxOutputDimension);
      p.resize(cappedWidth, cappedHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 });
      currentW = cappedWidth;
      currentH = cappedHeight;
      const upscaleCapMessage = `Upscaling was capped at ${LIMITS.maxOutputDimension}px per side.`;
      if (
        (cappedWidth !== upscaled.width || cappedHeight !== upscaled.height) &&
        !warnings.includes(upscaleCapMessage)
      ) {
        warnings.push(upscaleCapMessage);
      }
    }

    const scaledResize = { ...options.resize };
    if (scale !== 1) {
      scaledResize.width = Math.max(1, Math.round((scaledResize.width ?? currentW) * scale));
      scaledResize.height = Math.max(1, Math.round((scaledResize.height ?? currentH) * scale));
    }
    applyResize(p, scaledResize, LIMITS.maxOutputDimension);

    p.toColorspace("srgb");

    if (options.metadata === "preserve") {
      p.withMetadata();
    }

    const hasAlphaNow = Boolean(metadata.hasAlpha);
    if (!targetCap.supportsAlpha && hasAlphaNow) {
      p.flatten({ background: options.format.background ?? "#ffffff" });
    }

    return p;
  };

  if (
    !targetCap.supportsAlpha &&
    metadata.hasAlpha &&
    !warnings.some((w) => w.includes("transparency"))
  ) {
    warnings.push(
      `${targetCap.label} doesn't support transparency — transparent areas were filled with ${
        options.format.background ?? "white"
      }.`
    );
  }

  const wantsSizeTarget = targetBytes(options.targetSize);
  let outputBuffer: Buffer;
  let outWidth: number;
  let outHeight: number;

  if (wantsSizeTarget) {
    const opt = await optimizeForTargetSize(factory, options.format.target, wantsSizeTarget);
    outputBuffer = opt.best.buffer;
    outWidth = opt.best.width;
    outHeight = opt.best.height;
    if (!opt.satisfied) {
      warnings.push(
        "We reached the best practical quality available for this target size. Reducing the file size further would significantly affect image quality."
      );
    } else if (opt.dimensionsReduced) {
      warnings.push("Dimensions were slightly reduced to meet the requested file size.");
    }
  } else {
    // No size target: PNG defaults to lossless; other formats use a high
    // "smart" quality that keeps file sizes reasonable without visible loss.
    const defaultQuality = options.format.target === "png" ? 100 : 88;
    const encoded = encodeToFormat(factory(1), options.format.target, defaultQuality);
    const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
    outputBuffer = data;
    outWidth = info.width;
    outHeight = info.height;
  }

  const finalMeta = await sharp(outputBuffer).metadata();
  const finalSummary: ImageSummary = {
    filename: "",
    format: options.format.target,
    width: finalMeta.width ?? outWidth,
    height: finalMeta.height ?? outHeight,
    bytes: outputBuffer.length,
    hasAlpha: Boolean(finalMeta.hasAlpha),
    isAnimated: (finalMeta.pages ?? 1) > 1,
  };

  const recommendation = recommendFormats({
    hasAlpha: metadata.hasAlpha ?? false,
    isPhotographic: analysis.isPhotographic,
    isAnimated: sourceIsAnimated,
  });

  const filename = buildOutputFilename(originalFilename, options.format.target);
  finalSummary.filename = filename;

  const result: ProcessResult = {
    original: originalSummary,
    final: finalSummary,
    warnings,
    targetSizeStatus: wantsSizeTarget
      ? {
          requestedBytes: wantsSizeTarget,
          achievedBytes: outputBuffer.length,
          satisfied: outputBuffer.length <= wantsSizeTarget,
          dimensionsReduced: warnings.some((w) => w.includes("reduced")),
        }
      : undefined,
    recommendedFormats: recommendation.formats,
  };

  return { buffer: outputBuffer, filename, mime: targetCap.mime, result };
}
