import type {
  CustomEnhancement,
  EnhancementMode,
  MetadataMode,
  OutputFormat,
  ResizeMode,
  SizeUnit,
} from "@/lib/image/types";

export interface SharedSettings {
  enhancementMode: EnhancementMode;
  upscale: 1 | 1.5 | 2 | 3 | 4;
  custom: CustomEnhancement;
  width: number | null;
  height: number | null;
  aspectLock: boolean;
  resizeMode: ResizeMode;
  containBackground: string;
  format: OutputFormat;
  formatBackground: string;
  targetSizeValue: number | null;
  targetSizeUnit: SizeUnit;
  metadata: MetadataMode;
}

export const DEFAULT_CUSTOM_ENHANCEMENT: CustomEnhancement = {
  sharpness: 0,
  clarity: 0,
  contrast: 0,
  brightness: 0,
  saturation: 0,
  exposure: 0,
  denoise: 0,
};

export function defaultSettings(): SharedSettings {
  return {
    enhancementMode: "auto",
    upscale: 1,
    custom: { ...DEFAULT_CUSTOM_ENHANCEMENT },
    width: null,
    height: null,
    aspectLock: true,
    resizeMode: "fit",
    containBackground: "#ffffff",
    format: "webp",
    formatBackground: "#ffffff",
    targetSizeValue: null,
    targetSizeUnit: "KB",
    metadata: "strip",
  };
}
