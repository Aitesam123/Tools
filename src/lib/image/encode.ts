import type sharp from "sharp";
import type { OutputFormat } from "./types";

/** Formats that expose a meaningful 1-100 quality knob we can binary-search over. */
export const QUALITY_SEARCHABLE_FORMATS = new Set<OutputFormat>(["jpeg", "webp", "avif", "tiff"]);

export function encodeToFormat(
  pipeline: sharp.Sharp,
  format: OutputFormat,
  quality: number
): sharp.Sharp {
  const q = Math.round(Math.min(100, Math.max(1, quality)));
  switch (format) {
    case "jpeg":
      return pipeline.jpeg({ quality: q, mozjpeg: true, progressive: true });
    case "webp":
      return pipeline.webp({ quality: q, effort: 4 });
    case "avif":
      return pipeline.avif({ quality: q, effort: 4 });
    case "tiff":
      return pipeline.tiff({ quality: q });
    case "png":
      return pipeline.png({ quality: q, compressionLevel: 9, effort: 8, palette: q < 100 });
    case "gif":
      return pipeline.gif({ effort: 7 });
    default:
      return pipeline;
  }
}
