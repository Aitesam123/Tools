import sharp from "sharp";

export interface ImageAnalysis {
  isPhotographic: boolean;
  hasAlpha: boolean;
  isAnimated: boolean;
  meanBrightness: number; // 0-255
  meanSaturationProxy: number; // rough 0-1, derived from channel spread
  isLowContrast: boolean;
  isLikelyOverCompressed: boolean;
}

/**
 * Real per-image analysis used to drive Auto Enhance and format
 * recommendations. Uses sharp's actual pixel statistics (channel means,
 * standard deviations) rather than guessing from the file extension.
 */
export async function analyzeImage(
  pipeline: sharp.Sharp,
  metadata: sharp.Metadata
): Promise<ImageAnalysis> {
  const stats = await pipeline.clone().stats();
  const channels = stats.channels;
  const rgb = channels.slice(0, 3);
  const meanBrightness = rgb.reduce((sum, c) => sum + c.mean, 0) / (rgb.length || 1);
  const avgStdDev = rgb.reduce((sum, c) => sum + c.stdev, 0) / (rgb.length || 1);

  const maxMean = Math.max(...rgb.map((c) => c.mean));
  const minMean = Math.min(...rgb.map((c) => c.mean));
  const meanSaturationProxy = maxMean > 0 ? (maxMean - minMean) / maxMean : 0;

  const isLowContrast = avgStdDev < 35;
  // Photos are almost always fully opaque with meaningful tonal variation;
  // flat-color graphics/icons tend to be low-variance and/or carry alpha.
  const isPhotographic =
    metadata.format === "jpeg" ||
    metadata.format === "heif" ||
    metadata.format === "tiff" ||
    (rgb.length >= 3 && avgStdDev > 20 && stats.isOpaque);
  const isLikelyOverCompressed = metadata.format === "jpeg" && avgStdDev < 25;

  return {
    isPhotographic,
    hasAlpha: Boolean(metadata.hasAlpha),
    isAnimated: (metadata.pages ?? 1) > 1,
    meanBrightness,
    meanSaturationProxy,
    isLowContrast,
    isLikelyOverCompressed,
  };
}
