/** Encodes every segment of a path for a URL, keeping the slashes between them. */
export function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/** Preview widths the server renders; anything else would fill the cache. */
export const PREVIEW_WIDTHS = [480, 1920] as const;

export type PreviewWidth = (typeof PREVIEW_WIDTHS)[number];

export function isPreviewWidth(value: number): value is PreviewWidth {
  return (PREVIEW_WIDTHS as readonly number[]).includes(value);
}

/** A downscaled copy of a source, recolored when LUT settings are passed as JSON. */
export function previewUrl(
  path: string,
  version: number,
  width: PreviewWidth,
  lut?: string,
): string {
  const query = new URLSearchParams({ w: String(width), v: String(version) });

  if (lut) {
    query.set("lut", lut);
  }

  return `/preview/${encodePath(path)}?${query}`;
}

export function outputUrl(file: string, version: number): string {
  return `/output/${encodePath(file)}?v=${version}`;
}

/** A source as it is on disk, served for downloading. */
export function originalUrl(path: string, version: number): string {
  return `/original/${encodePath(path)}?v=${version}`;
}
