import { NextResponse } from "next/server";
import { getOutputCapabilities } from "@/lib/image/formats";
import { SOCIAL_PRESETS, FILE_SIZE_PRESETS } from "@/lib/image/presets";
import { LIMITS } from "@/lib/image/limits";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    formats: getOutputCapabilities(),
    socialPresets: SOCIAL_PRESETS,
    fileSizePresets: FILE_SIZE_PRESETS,
    limits: {
      maxUploadBytes: LIMITS.maxUploadBytes,
      maxInputPixels: LIMITS.maxInputPixels,
      maxOutputDimension: LIMITS.maxOutputDimension,
      maxBatchFiles: LIMITS.maxBatchFiles,
    },
  });
}
