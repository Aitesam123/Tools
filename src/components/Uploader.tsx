"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  onFiles: (files: File[]) => void;
  maxFiles: number;
  disabled?: boolean;
}

export default function Uploader({ onFiles, maxFiles, disabled }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (list: FileList | File[]) => {
      const files = Array.from(list).slice(0, maxFiles);
      if (files.length > 0) onFiles(files);
    },
    [onFiles, maxFiles]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload images: drag and drop, click to browse, or paste from clipboard"
      className={`card flex flex-col items-center justify-center gap-3 border-2 border-dashed p-10 text-center transition-colors sm:p-16 ${
        dragOver
          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
          : "border-neutral-300 dark:border-ink-600"
      } ${disabled ? "opacity-50" : "cursor-pointer hover:border-brand-400"}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
      }}
      onPaste={(e) => {
        if (disabled) return;
        const items = Array.from(e.clipboardData?.files ?? []);
        if (items.length) handleFiles(items);
      }}
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-2xl text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        ↑
      </div>
      <p className="text-base font-medium">Drag & drop images here</p>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        or click to browse · paste from clipboard · up to {maxFiles} files
      </p>
      <p className="text-xs text-neutral-400 dark:text-neutral-500">
        JPEG, PNG, WEBP, AVIF, TIFF, GIF, BMP
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
