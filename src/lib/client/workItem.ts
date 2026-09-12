import type { CropRect, ProcessResult } from "@/lib/image/types";

export type ItemStatus = "waiting" | "analyzing" | "ready" | "processing" | "done" | "error";

export interface WorkItem {
  id: string;
  file: File;
  previewUrl: string;
  status: ItemStatus;
  error?: string;
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  crop: CropRect | null;
  analysis?: {
    width: number;
    height: number;
    format: string;
    bytes: number;
    hasAlpha: boolean;
    isAnimated: boolean;
    recommendedFormats: string[];
  };
  result?: {
    processResult: ProcessResult;
    base64: string;
    mime: string;
    filename: string;
    blobUrl: string;
  };
}

export function createWorkItem(file: File): WorkItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    file,
    previewUrl: URL.createObjectURL(file),
    status: "waiting",
    rotate: 0,
    flipH: false,
    flipV: false,
    crop: null,
  };
}
