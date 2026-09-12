"use client";

import { useRef, useState } from "react";
import type { CropRect } from "@/lib/image/types";

interface Props {
  imageUrl: string;
  initial?: CropRect | null;
  onApply: (rect: CropRect | null) => void;
  onCancel: () => void;
}

const ASPECT_PRESETS: { label: string; ratio: number | null }[] = [
  { label: "Free", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "4:3", ratio: 4 / 3 },
];

type DragMode = "none" | "create" | "move" | "nw" | "ne" | "sw" | "se";

export default function CropTool({ imageUrl, initial, onApply, onCancel }: Props) {
  const [rect, setRect] = useState<CropRect>(initial ?? { x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
  const [aspect, setAspect] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ mode: DragMode; startX: number; startY: number; startRect: CropRect }>({
    mode: "none",
    startX: 0,
    startY: 0,
    startRect: rect,
  });

  function toFraction(clientX: number, clientY: number) {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
  }

  function clamp01(v: number) {
    return Math.min(1, Math.max(0, v));
  }

  function applyAspect(r: CropRect, ratio: number | null): CropRect {
    if (!ratio) return r;
    const centerX = r.x + r.width / 2;
    const centerY = r.y + r.height / 2;
    let width = r.width;
    let height = width / ratio;
    if (height > 1) {
      height = r.height;
      width = height * ratio;
    }
    let x = clamp01(centerX - width / 2);
    let y = clamp01(centerY - height / 2);
    width = Math.min(width, 1 - x);
    height = Math.min(height, 1 - y);
    return { x, y, width, height };
  }

  function onPointerDown(e: React.PointerEvent, mode: DragMode) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const { x, y } = toFraction(e.clientX, e.clientY);
    dragState.current = { mode, startX: x, startY: y, startRect: rect };
  }

  function onContainerPointerDown(e: React.PointerEvent) {
    const { x, y } = toFraction(e.clientX, e.clientY);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragState.current = { mode: "create", startX: x, startY: y, startRect: { x, y, width: 0, height: 0 } };
    setRect({ x, y, width: 0, height: 0 });
  }

  function onPointerMove(e: React.PointerEvent) {
    const { mode, startX, startY, startRect } = dragState.current;
    if (mode === "none") return;
    const { x, y } = toFraction(e.clientX, e.clientY);
    const dx = x - startX;
    const dy = y - startY;

    let next: CropRect = startRect;
    if (mode === "create") {
      const nx = Math.min(startX, x);
      const ny = Math.min(startY, y);
      next = { x: clamp01(nx), y: clamp01(ny), width: Math.abs(x - startX), height: Math.abs(y - startY) };
    } else if (mode === "move") {
      const nx = clamp01(startRect.x + dx);
      const ny = clamp01(startRect.y + dy);
      next = {
        x: Math.min(nx, 1 - startRect.width),
        y: Math.min(ny, 1 - startRect.height),
        width: startRect.width,
        height: startRect.height,
      };
    } else {
      // corner resize
      let { x: rx, y: ry, width: rw, height: rh } = startRect;
      if (mode === "se") {
        rw = clamp01(startRect.x + startRect.width + dx) - rx;
        rh = clamp01(startRect.y + startRect.height + dy) - ry;
      } else if (mode === "nw") {
        const newX = clamp01(startRect.x + dx);
        const newY = clamp01(startRect.y + dy);
        rw = startRect.x + startRect.width - newX;
        rh = startRect.y + startRect.height - newY;
        rx = newX;
        ry = newY;
      } else if (mode === "ne") {
        const newY = clamp01(startRect.y + dy);
        rw = clamp01(startRect.x + startRect.width + dx) - rx;
        rh = startRect.y + startRect.height - newY;
        ry = newY;
      } else if (mode === "sw") {
        const newX = clamp01(startRect.x + dx);
        rw = startRect.x + startRect.width - newX;
        rh = clamp01(startRect.y + startRect.height + dy) - ry;
        rx = newX;
      }
      next = { x: rx, y: ry, width: Math.max(0.02, rw), height: Math.max(0.02, rh) };
    }

    setRect(aspect ? applyAspect(next, aspect) : next);
  }

  function onPointerUp() {
    dragState.current.mode = "none";
  }

  const style = {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap gap-1.5">
        {ASPECT_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              aspect === p.ratio
                ? "bg-brand-600 text-white"
                : "bg-neutral-100 text-neutral-700 dark:bg-ink-800 dark:text-neutral-300"
            }`}
            onClick={() => {
              setAspect(p.ratio);
              setRect((r) => (p.ratio ? applyAspect(r, p.ratio) : r));
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        className="relative aspect-[4/3] w-full touch-none overflow-hidden rounded-lg bg-neutral-900"
        onPointerDown={onContainerPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain opacity-60" draggable={false} />
        <div
          className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          style={style}
          onPointerDown={(e) => onPointerDown(e, "move")}
        >
          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
            <div
              key={corner}
              onPointerDown={(e) => onPointerDown(e, corner)}
              className={`absolute h-3.5 w-3.5 rounded-full border-2 border-brand-600 bg-white ${
                corner.includes("n") ? "-top-1.5" : "-bottom-1.5"
              } ${corner.includes("w") ? "-left-1.5" : "-right-1.5"}`}
              style={{ cursor: `${corner}-resize` }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onApply(null)}
        >
          Remove crop
        </button>
        <button type="button" className="btn-primary" onClick={() => onApply(rect)}>
          Apply crop
        </button>
      </div>
    </div>
  );
}
