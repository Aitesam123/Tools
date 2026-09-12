export interface DimensionPreset {
  label: string;
  width: number;
  height: number;
}

export interface PresetGroup {
  group: string;
  presets: DimensionPreset[];
}

export const SOCIAL_PRESETS: PresetGroup[] = [
  {
    group: "Instagram",
    presets: [
      { label: "Square", width: 1080, height: 1080 },
      { label: "Portrait", width: 1080, height: 1350 },
      { label: "Story / Reel", width: 1080, height: 1920 },
    ],
  },
  {
    group: "Facebook",
    presets: [
      { label: "Shared image", width: 1200, height: 630 },
      { label: "Square", width: 1080, height: 1080 },
    ],
  },
  {
    group: "LinkedIn",
    presets: [
      { label: "Shared image", width: 1200, height: 627 },
      { label: "Square", width: 1080, height: 1080 },
    ],
  },
  {
    group: "YouTube",
    presets: [
      { label: "Thumbnail", width: 1280, height: 720 },
      { label: "Channel banner area", width: 1920, height: 1080 },
    ],
  },
  {
    group: "Website",
    presets: [
      { label: "Full HD", width: 1920, height: 1080 },
      { label: "HD", width: 1600, height: 900 },
    ],
  },
  {
    group: "Ecommerce",
    presets: [
      { label: "Standard", width: 1000, height: 1000 },
      { label: "Large", width: 1500, height: 1500 },
      { label: "Extra large", width: 2000, height: 2000 },
    ],
  },
];

export const FILE_SIZE_PRESETS: { label: string; value: number | null; unit: "KB" | "MB" }[] = [
  { label: "No limit", value: null, unit: "KB" },
  { label: "250 KB", value: 250, unit: "KB" },
  { label: "500 KB", value: 500, unit: "KB" },
  { label: "750 KB", value: 750, unit: "KB" },
  { label: "1 MB", value: 1, unit: "MB" },
  { label: "2 MB", value: 2, unit: "MB" },
  { label: "5 MB", value: 5, unit: "MB" },
];
