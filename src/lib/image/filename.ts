const EXTENSION_BY_FORMAT: Record<string, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
  tiff: "tiff",
  gif: "gif",
};

/** Strips path components, unsafe characters, and any executable-looking extension. */
export function sanitizeBaseName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "image";
  const withoutExt = base.replace(/\.[^.]+$/, "");
  const safe = withoutExt
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return safe.length > 0 ? safe : "image";
}

export function buildOutputFilename(
  originalName: string,
  format: string,
  suffix?: string
): string {
  const base = sanitizeBaseName(originalName);
  const ext = EXTENSION_BY_FORMAT[format] ?? "bin";
  return suffix ? `${base}-${suffix}.${ext}` : `${base}.${ext}`;
}
