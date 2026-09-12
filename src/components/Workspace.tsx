"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import Uploader from "./Uploader";
import SettingsPanel from "./SettingsPanel";
import ImageCard from "./ImageCard";
import type { FormatCapability } from "@/lib/image/formats";
import type { PresetGroup } from "@/lib/image/presets";
import type { ProcessRequestOptions } from "@/lib/image/types";
import { defaultSettings, type SharedSettings } from "@/lib/client/settings";
import { createWorkItem, type WorkItem } from "@/lib/client/workItem";
import { base64ToBlob, formatBytes } from "@/lib/client/util";

interface Capabilities {
  formats: FormatCapability[];
  socialPresets: PresetGroup[];
  fileSizePresets: { label: string; value: number | null; unit: "KB" | "MB" }[];
  limits: { maxUploadBytes: number; maxInputPixels: number; maxOutputDimension: number; maxBatchFiles: number };
}

const CONCURRENCY = 3;

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let index = 0;
  async function next(): Promise<void> {
    const i = index++;
    if (i >= items.length) return;
    await worker(items[i]!);
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
}

export default function Workspace() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [settings, setSettings] = useState<SharedSettings>(defaultSettings());
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const itemsRef = useRef<WorkItem[]>([]);
  itemsRef.current = items;

  useEffect(() => {
    fetch("/api/capabilities")
      .then((r) => r.json())
      .then((data: Capabilities) => {
        setCaps(data);
        setSettings((s) => ({
          ...s,
          format: data.formats.some((f) => f.format === s.format) ? s.format : (data.formats[0]?.format ?? s.format),
        }));
      })
      .catch(() => {});
  }, []);

  function updateItem(id: string, patch: Partial<WorkItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function addFiles(files: File[]) {
    const maxFiles = caps?.limits.maxBatchFiles ?? 30;
    const room = Math.max(0, maxFiles - itemsRef.current.length);
    const accepted = files.slice(0, room).map(createWorkItem);
    if (accepted.length === 0) return;
    setItems((prev) => [...prev, ...accepted]);

    await runPool(accepted, CONCURRENCY, async (item) => {
      updateItem(item.id, { status: "analyzing" });
      try {
        const form = new FormData();
        form.append("file", item.file);
        const res = await fetch("/api/analyze", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Analysis failed.");
        updateItem(item.id, {
          status: "ready",
          analysis: {
            width: data.width,
            height: data.height,
            format: data.format,
            bytes: data.bytes,
            hasAlpha: data.hasAlpha,
            isAnimated: data.isAnimated,
            recommendedFormats: data.recommendation?.formats ?? [],
          },
        });
      } catch (err) {
        updateItem(item.id, { status: "error", error: err instanceof Error ? err.message : "Analysis failed." });
      }
    });
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.result) URL.revokeObjectURL(target.result.blobUrl);
      }
      return prev.filter((it) => it.id !== id);
    });
  }

  function buildOptions(item: WorkItem): ProcessRequestOptions {
    return {
      enhancement: {
        mode: settings.enhancementMode,
        upscale: settings.upscale,
        custom: settings.enhancementMode === "custom" ? settings.custom : undefined,
      },
      transform: {
        rotate: item.rotate,
        flipH: item.flipH,
        flipV: item.flipV,
        crop: item.crop,
      },
      resize: {
        width: settings.width ?? undefined,
        height: settings.height ?? undefined,
        mode: settings.resizeMode,
        background: settings.resizeMode === "contain" ? settings.containBackground : undefined,
      },
      format: { target: settings.format, background: settings.formatBackground },
      targetSize: settings.targetSizeValue ? { value: settings.targetSizeValue, unit: settings.targetSizeUnit } : null,
      metadata: settings.metadata,
    };
  }

  async function processItem(item: WorkItem) {
    updateItem(item.id, { status: "processing", error: undefined });
    try {
      const form = new FormData();
      form.append("file", item.file);
      form.append("filename", item.file.name);
      form.append("options", JSON.stringify(buildOptions(item)));
      const res = await fetch("/api/process", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Processing failed.");

      const blob = base64ToBlob(data.fileBase64, data.mime);
      const blobUrl = URL.createObjectURL(blob);
      updateItem(item.id, {
        status: "done",
        result: {
          processResult: data.result,
          base64: data.fileBase64,
          mime: data.mime,
          filename: data.filename,
          blobUrl,
        },
      });
    } catch (err) {
      updateItem(item.id, { status: "error", error: err instanceof Error ? err.message : "Processing failed." });
    }
  }

  async function processAll() {
    const targets = itemsRef.current.filter((it) => it.status !== "processing");
    setIsBatchRunning(true);
    await runPool(targets, CONCURRENCY, processItem);
    setIsBatchRunning(false);
  }

  async function downloadAllAsZip() {
    const done = items.filter((it) => it.result);
    if (done.length === 0) return;
    const zip = new JSZip();
    const usedNames = new Set<string>();
    for (const it of done) {
      let name = it.result!.filename;
      let n = 1;
      while (usedNames.has(name)) {
        const dot = it.result!.filename.lastIndexOf(".");
        name = `${it.result!.filename.slice(0, dot)}-${n}${it.result!.filename.slice(dot)}`;
        n += 1;
      }
      usedNames.add(name);
      zip.file(name, base64ToBlob(it.result!.base64, it.result!.mime));
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted-images.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function resetAll() {
    items.forEach((it) => {
      URL.revokeObjectURL(it.previewUrl);
      if (it.result) URL.revokeObjectURL(it.result.blobUrl);
    });
    setItems([]);
  }

  const completedCount = items.filter((it) => it.status === "done").length;
  const failedCount = items.filter((it) => it.status === "error").length;
  const referenceAspect = useMemo(() => {
    const first = items.find((it) => it.analysis);
    return first?.analysis ? first.analysis.width / first.analysis.height : null;
  }, [items]);

  const totalOriginalBytes = items.reduce((sum, it) => sum + (it.analysis?.bytes ?? 0), 0);
  const totalFinalBytes = items.reduce((sum, it) => sum + (it.result?.processResult.final.bytes ?? 0), 0);

  return (
    <section id="workspace" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Uploader onFiles={addFiles} maxFiles={caps?.limits.maxBatchFiles ?? 30} disabled={!caps} />

          {items.length > 0 && (
            <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm text-neutral-600 dark:text-neutral-300">
                <span className="font-medium">
                  {completedCount} / {items.length} Completed
                </span>
                {failedCount > 0 && <span className="ml-2 text-red-600 dark:text-red-400">{failedCount} failed</span>}
                {completedCount > 0 && (
                  <span className="ml-2 text-neutral-400">
                    · {formatBytes(totalOriginalBytes)} → {formatBytes(totalFinalBytes)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={resetAll}>
                  Reset
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={completedCount === 0}
                  onClick={downloadAllAsZip}
                >
                  Download All (ZIP)
                </button>
                <button type="button" className="btn-primary" disabled={isBatchRunning} onClick={processAll}>
                  {isBatchRunning ? "Processing…" : "Process Image" + (items.length > 1 ? "s" : "")}
                </button>
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <ImageCard
                  key={item.id}
                  item={item}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  onReprocess={(id) => {
                    const target = itemsRef.current.find((it) => it.id === id);
                    if (target) processItem(target);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-4">
            <h2 className="mb-4 text-base font-semibold">Settings</h2>
            {caps ? (
              <SettingsPanel
                settings={settings}
                onChange={setSettings}
                formats={caps.formats}
                socialPresets={caps.socialPresets}
                fileSizePresets={caps.fileSizePresets}
                referenceAspect={referenceAspect}
                maxOutputDimension={caps.limits.maxOutputDimension}
              />
            ) : (
              <p className="text-sm text-neutral-500">Loading engine capabilities…</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
