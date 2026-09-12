"use client";

import { useState } from "react";
import type { WorkItem } from "@/lib/client/workItem";
import { formatBytes, downloadBuffer } from "@/lib/client/util";
import CropTool from "./CropTool";
import CompareSlider from "./CompareSlider";

interface Props {
  item: WorkItem;
  onUpdate: (id: string, patch: Partial<WorkItem>) => void;
  onRemove: (id: string) => void;
  onReprocess: (id: string) => void;
}

export default function ImageCard({ item, onUpdate, onRemove, onReprocess }: Props) {
  const [cropOpen, setCropOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const rotateCycle = { 0: 90, 90: 180, 180: 270, 270: 0 } as const;

  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-square bg-neutral-100 dark:bg-ink-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" />
        <div className="absolute right-2 top-2 flex gap-1">
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
            title="Remove"
            aria-label={`Remove ${item.file.name}`}
            onClick={() => onRemove(item.id)}
          >
            ×
          </button>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className="space-y-2 p-3">
        <p className="truncate text-sm font-medium" title={item.file.name}>
          {item.file.name}
        </p>
        {item.analysis && (
          <p className="text-xs text-neutral-500">
            {item.analysis.width}×{item.analysis.height} · {formatBytes(item.analysis.bytes)} ·{" "}
            {item.analysis.format.toUpperCase()}
            {item.analysis.recommendedFormats.length > 0 && (
              <> · Suggested: {item.analysis.recommendedFormats.join(", ").toUpperCase()}</>
            )}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="btn-ghost !px-2 !py-1 text-xs"
            title="Rotate 90°"
            onClick={() => onUpdate(item.id, { rotate: rotateCycle[item.rotate] })}
          >
            ⟳ Rotate ({item.rotate}°)
          </button>
          <button
            type="button"
            className="btn-ghost !px-2 !py-1 text-xs"
            aria-pressed={item.flipH}
            onClick={() => onUpdate(item.id, { flipH: !item.flipH })}
          >
            ⇋ Flip H
          </button>
          <button
            type="button"
            className="btn-ghost !px-2 !py-1 text-xs"
            aria-pressed={item.flipV}
            onClick={() => onUpdate(item.id, { flipV: !item.flipV })}
          >
            ⇵ Flip V
          </button>
          <button
            type="button"
            className="btn-ghost !px-2 !py-1 text-xs"
            aria-pressed={cropOpen}
            onClick={() => setCropOpen((v) => !v)}
          >
            ⬚ Crop {item.crop ? "✓" : ""}
          </button>
        </div>

        {cropOpen && (
          <CropTool
            imageUrl={item.previewUrl}
            initial={item.crop}
            onApply={(rect) => {
              onUpdate(item.id, { crop: rect });
              setCropOpen(false);
            }}
            onCancel={() => setCropOpen(false)}
          />
        )}

        {item.status === "error" && (
          <p className="rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {item.error}
          </p>
        )}

        {item.result && (
          <div className="space-y-2 rounded-lg bg-neutral-50 p-2.5 dark:bg-ink-800/60">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-neutral-400">Original</p>
                <p className="font-medium">
                  {item.result.processResult.original.width}×{item.result.processResult.original.height}
                </p>
                <p>{formatBytes(item.result.processResult.original.bytes)}</p>
              </div>
              <div>
                <p className="text-neutral-400">Final</p>
                <p className="font-medium">
                  {item.result.processResult.final.width}×{item.result.processResult.final.height} ✓
                </p>
                <p>
                  {formatBytes(item.result.processResult.final.bytes)} ✓ ·{" "}
                  {item.result.processResult.final.format.toUpperCase()}
                </p>
              </div>
            </div>

            {item.result.processResult.warnings.length > 0 && (
              <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                {item.result.processResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}

            {compareOpen && (
              <CompareSlider
                beforeUrl={item.previewUrl}
                afterUrl={item.result.blobUrl}
                beforeLabel={`Before · ${formatBytes(item.result.processResult.original.bytes)}`}
                afterLabel={`After · ${formatBytes(item.result.processResult.final.bytes)}`}
              />
            )}

            <div className="flex flex-wrap gap-1.5">
              <button type="button" className="btn-secondary !px-2.5 !py-1.5 text-xs" onClick={() => setCompareOpen((v) => !v)}>
                {compareOpen ? "Hide compare" : "Compare"}
              </button>
              <button
                type="button"
                className="btn-primary !px-2.5 !py-1.5 text-xs"
                onClick={() =>
                  downloadBuffer(item.result!.base64, item.result!.mime, item.result!.filename)
                }
              >
                Download
              </button>
              <button type="button" className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => onReprocess(item.id)}>
                Reprocess
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: WorkItem["status"] }) {
  if (status === "waiting") return null;
  const map: Record<string, { label: string; cls: string }> = {
    analyzing: { label: "Analyzing…", cls: "bg-neutral-700" },
    ready: { label: "Ready", cls: "bg-neutral-700" },
    processing: { label: "Processing…", cls: "bg-brand-600" },
    done: { label: "✓ Completed", cls: "bg-emerald-600" },
    error: { label: "Failed", cls: "bg-red-600" },
  };
  const info = map[status];
  if (!info) return null;
  return (
    <span className={`absolute left-2 top-2 rounded-md px-2 py-1 text-xs font-medium text-white ${info.cls}`}>
      {info.label}
    </span>
  );
}
