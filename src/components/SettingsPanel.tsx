"use client";

import type { FormatCapability } from "@/lib/image/formats";
import type { PresetGroup } from "@/lib/image/presets";
import type { SharedSettings } from "@/lib/client/settings";
import { clamp } from "@/lib/client/util";

interface Props {
  settings: SharedSettings;
  onChange: (next: SharedSettings) => void;
  formats: FormatCapability[];
  socialPresets: PresetGroup[];
  fileSizePresets: { label: string; value: number | null; unit: "KB" | "MB" }[];
  referenceAspect: number | null;
  maxOutputDimension: number;
}

const ENHANCEMENT_MODES: { value: SharedSettings["enhancementMode"]; label: string; hint: string }[] = [
  { value: "none", label: "None", hint: "No changes" },
  { value: "auto", label: "Auto", hint: "Analyzes and adapts" },
  { value: "natural", label: "Natural", hint: "Subtle, realistic" },
  { value: "sharp", label: "Sharp", hint: "Crisper edges" },
  { value: "detailed", label: "Detailed", hint: "More fine detail" },
  { value: "portrait", label: "Portrait", hint: "Skin-safe" },
  { value: "product", label: "Product", hint: "Ecommerce-ready" },
  { value: "recovery", label: "Low-Quality Recovery", hint: "For heavily compressed sources" },
  { value: "custom", label: "Custom", hint: "Manual controls" },
];

const RESIZE_MODES: { value: SharedSettings["resizeMode"]; label: string; hint: string }[] = [
  { value: "fit", label: "Fit", hint: "Whole image inside the box, no crop" },
  { value: "fill", label: "Fill", hint: "Fills the box, crops excess (centered)" },
  { value: "crop", label: "Crop to Fit", hint: "Fills the box, smart content-aware crop" },
  { value: "exact", label: "Exact", hint: "Exact size — may distort proportions" },
  { value: "contain", label: "Contain", hint: "Fits inside, pads with background color" },
];

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="label mb-0">{label}</span>
        <span className="text-xs tabular-nums text-neutral-500">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-600"
        aria-label={label}
      />
    </div>
  );
}

export default function SettingsPanel({
  settings: s,
  onChange,
  formats,
  socialPresets,
  fileSizePresets,
  referenceAspect,
  maxOutputDimension,
}: Props) {
  function set<K extends keyof SharedSettings>(key: K, value: SharedSettings[K]) {
    onChange({ ...s, [key]: value });
  }

  function setWidth(width: number | null) {
    if (s.aspectLock && width && referenceAspect) {
      onChange({ ...s, width, height: Math.round(width / referenceAspect) });
    } else {
      set("width", width);
    }
  }

  function setHeight(height: number | null) {
    if (s.aspectLock && height && referenceAspect) {
      onChange({ ...s, height, width: Math.round(height * referenceAspect) });
    } else {
      set("height", height);
    }
  }

  const targetFormat = formats.find((f) => f.format === s.format);

  return (
    <div className="space-y-6">
      {/* Enhancement */}
      <section>
        <h3 className="mb-2 text-sm font-semibold">Enhancement</h3>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {ENHANCEMENT_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              title={m.hint}
              aria-pressed={s.enhancementMode === m.value}
              className={`rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                s.enhancementMode === m.value
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-ink-600 dark:text-neutral-300"
              }`}
              onClick={() => set("enhancementMode", m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {s.enhancementMode === "custom" && (
          <div className="mt-3 space-y-3 rounded-xl bg-neutral-50 p-3 dark:bg-ink-800/60">
            <Slider label="Sharpness" value={s.custom.sharpness} min={0} max={100} onChange={(v) => set("custom", { ...s.custom, sharpness: v })} />
            <Slider label="Clarity" value={s.custom.clarity} min={0} max={100} onChange={(v) => set("custom", { ...s.custom, clarity: v })} />
            <Slider label="Contrast" value={s.custom.contrast} min={-100} max={100} onChange={(v) => set("custom", { ...s.custom, contrast: v })} />
            <Slider label="Brightness" value={s.custom.brightness} min={-100} max={100} onChange={(v) => set("custom", { ...s.custom, brightness: v })} />
            <Slider label="Saturation" value={s.custom.saturation} min={-100} max={100} onChange={(v) => set("custom", { ...s.custom, saturation: v })} />
            <Slider label="Exposure" value={s.custom.exposure} min={-100} max={100} onChange={(v) => set("custom", { ...s.custom, exposure: v })} />
            <Slider label="Noise Reduction" value={s.custom.denoise} min={0} max={100} onChange={(v) => set("custom", { ...s.custom, denoise: v })} />
          </div>
        )}

        <div className="mt-3">
          <span className="label">Upscale (Lanczos resampling, not AI super-resolution)</span>
          <div className="segmented">
            {[1, 1.5, 2, 3, 4].map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={s.upscale === f}
                onClick={() => set("upscale", f as SharedSettings["upscale"])}
              >
                {f}×
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Format */}
      <section>
        <h3 className="mb-2 text-sm font-semibold">Convert To</h3>
        <select className="input" value={s.format} onChange={(e) => set("format", e.target.value as SharedSettings["format"])}>
          {formats.map((f) => (
            <option key={f.format} value={f.format}>
              {f.label}
            </option>
          ))}
        </select>
        {targetFormat && !targetFormat.supportsAlpha && (
          <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
            <span>{targetFormat.label} doesn&apos;t support transparency. Background:</span>
            <input
              type="color"
              value={s.formatBackground}
              onChange={(e) => set("formatBackground", e.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-neutral-300 dark:border-ink-600"
              aria-label="Background color for transparency flattening"
            />
          </div>
        )}
      </section>

      {/* Resize */}
      <section>
        <h3 className="mb-2 text-sm font-semibold">Resize</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="label">Width (px)</span>
            <input
              type="number"
              className="input"
              value={s.width ?? ""}
              placeholder="Original"
              min={1}
              max={maxOutputDimension}
              onChange={(e) => setWidth(e.target.value ? clamp(Number(e.target.value), 1, maxOutputDimension) : null)}
            />
          </div>
          <div>
            <span className="label">Height (px)</span>
            <input
              type="number"
              className="input"
              value={s.height ?? ""}
              placeholder="Original"
              min={1}
              max={maxOutputDimension}
              onChange={(e) => setHeight(e.target.value ? clamp(Number(e.target.value), 1, maxOutputDimension) : null)}
            />
          </div>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <input type="checkbox" checked={s.aspectLock} onChange={(e) => set("aspectLock", e.target.checked)} />
          🔒 Lock aspect ratio
        </label>

        <div className="mt-3">
          <span className="label">Resize Mode</span>
          <select
            className="input"
            value={s.resizeMode}
            onChange={(e) => set("resizeMode", e.target.value as SharedSettings["resizeMode"])}
          >
            {RESIZE_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} — {m.hint}
              </option>
            ))}
          </select>
        </div>

        {s.resizeMode === "contain" && (
          <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
            <span>Padding color:</span>
            <input
              type="color"
              value={s.containBackground}
              onChange={(e) => set("containBackground", e.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-neutral-300 dark:border-ink-600"
            />
          </div>
        )}

        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-neutral-500">Social & web presets</summary>
          <div className="mt-2 space-y-2">
            {socialPresets.map((group) => (
              <div key={group.group}>
                <p className="mb-1 text-xs font-semibold text-neutral-400">{group.group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.presets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-200 dark:bg-ink-800 dark:text-neutral-300 dark:hover:bg-ink-700"
                      onClick={() => onChange({ ...s, width: p.width, height: p.height })}
                    >
                      {p.label} ({p.width}×{p.height})
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* Target size */}
      <section>
        <h3 className="mb-2 text-sm font-semibold">Target File Size</h3>
        <div className="flex flex-wrap gap-1.5">
          {fileSizePresets.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={s.targetSizeValue === p.value && (p.value === null || s.targetSizeUnit === p.unit)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                s.targetSizeValue === p.value
                  ? "bg-brand-600 text-white"
                  : "bg-neutral-100 text-neutral-700 dark:bg-ink-800 dark:text-neutral-300"
              }`}
              onClick={() => onChange({ ...s, targetSizeValue: p.value, targetSizeUnit: p.unit })}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            className="input"
            placeholder="Custom"
            min={1}
            value={s.targetSizeValue ?? ""}
            onChange={(e) => set("targetSizeValue", e.target.value ? Number(e.target.value) : null)}
          />
          <select
            className="input w-24"
            value={s.targetSizeUnit}
            onChange={(e) => set("targetSizeUnit", e.target.value as SharedSettings["targetSizeUnit"])}
          >
            <option value="KB">KB</option>
            <option value="MB">MB</option>
          </select>
        </div>
      </section>

      {/* Metadata */}
      <section>
        <h3 className="mb-2 text-sm font-semibold">Metadata</h3>
        <div className="segmented">
          <button type="button" aria-pressed={s.metadata === "preserve"} onClick={() => set("metadata", "preserve")}>
            Preserve
          </button>
          <button type="button" aria-pressed={s.metadata === "strip"} onClick={() => set("metadata", "strip")}>
            Remove
          </button>
        </div>
        <p className="mt-1.5 text-xs text-neutral-500">
          Removing metadata strips EXIF/GPS/camera data — recommended before sharing images publicly.
        </p>
      </section>
    </div>
  );
}
