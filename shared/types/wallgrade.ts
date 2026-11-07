/** A point in an image, from 0 (left or top edge) to 1 (right or bottom edge). */
export interface FocusPoint {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** An area in pixels, e.g. the part of a source that ends up in an output. */
export interface Rect extends Size {
  x: number;
  y: number;
}

export type LutAlgorithm =
  "gaussian-blur" | "gaussian-rbf" | "shepards-method" | "nearest-neighbor";

/** How lutgen builds the Hald CLUT, see `lutgen generate --help`. */
export interface LutSettings {
  /** Off keeps the original colors. */
  enabled: boolean;
  /** Built-in palette, see `lutgen palette names`. */
  palette: string;
  algorithm: LutAlgorithm;
  /** Gaussian blur sigma; larger blends more. */
  radius: number;
  /** Gaussian RBF shape; larger blends less. */
  shape: number;
  /** Shepard's method power. */
  power: number;
  /** Palette colors RBF and Shepard's method consider per pixel, 0 for all. */
  nearest: number;
  /** Hald CLUT level from 2 to 16. */
  level: number;
  /** Luminosity factor; lower keeps more color. */
  luminosity: number;
  /** Keep the source's luminosity after mapping. */
  preserve: boolean;
}

/** libvips' ways of finding the subject, for files cropped without a point. */
export type FocusStrategy = "centre" | "attention" | "entropy";

/** manual crops around each file's own point. */
export type FocusMode = "manual" | FocusStrategy;

export type OutputFormat = "avif" | "webp" | "jpg" | "png" | "jxl";

export interface OutputPreset {
  /** Shown in lists and available as {output} in the file name template. */
  name: string;
  /** WxH. */
  size: string;
  /** Rendered for every file. */
  enabled: boolean;
}

/** The batch settings, used by every file that does not override them. */
export interface Settings {
  outputs: OutputPreset[];
  /**
   * Monitors as WxH+X+Y, like xrandr prints them. An output that matches the box
   * around all of them shows where each monitor sits.
   */
  monitors: string[];
  lut: LutSettings;
  focus: FocusMode;
  format: OutputFormat;
  /** From 1 to 100, ignored for PNG. */
  quality: number;
  /** Output path below the output directory, without the extension. */
  template: string;
}

/** What one file changes about the batch settings. */
export interface FileOverrides {
  lut?: Partial<LutSettings>;
  focus?: FocusMode;
}

/**
 * done: made with the current settings and focus point.
 * stale: exists, but the settings, the focus point or the source changed since.
 * missing: not rendered yet.
 */
export type OutputStatus = "done" | "stale" | "missing";

export interface ImageOutput {
  /** Name of the output preset. */
  name: string;
  /** WxH. */
  size: string;
  status: OutputStatus;
  /** Path below the output directory, where it is or would be written. */
  file: string;
  /** Changes whenever the file is rewritten, to bypass the browser cache. */
  version: number;
}

export interface LibraryImage {
  /** Path below the source directory, with forward slashes. */
  path: string;
  /** File name without the extension. */
  name: string;
  /** Folder below the source directory, empty for the top level. */
  folder: string;
  width: number;
  height: number;
  /** As sharp names it, e.g. jpeg. */
  format: string;
  /** Color space as libvips names it, e.g. srgb. */
  space: string;
  /** Bits per channel. */
  depth: number;
  /** Changes whenever the source is rewritten, to bypass the browser cache. */
  version: number;
  /** Set by hand, used while the focus mode is manual. */
  point: FocusPoint | null;
  overrides: FileOverrides;
  /** Left out of renders and downloads. */
  skip: boolean;
  /** One per enabled output preset. */
  outputs: ImageOutput[];
  /** Another source whose output would be written to the same file. */
  conflict: string | null;
}

/** Where libvips' strategies place the crop, as focus points. */
export interface AutoFocus {
  attention: FocusPoint;
  entropy: FocusPoint;
}

export interface ImageDetail extends LibraryImage {
  /** By output size. */
  auto: Record<string, AutoFocus>;
}

/** What the previews show: the source, the recolored copy or both side by side. */
export type CompareMode = "before" | "after" | "split";

export interface Status {
  /** lutgen's version, null when it is not installed. */
  lutgen: string | null;
  /** The vips command's version, null when it is not installed. */
  vips: string | null;
  sourceDir: string;
  outputDir: string;
  /** Directories the server can't write to, so uploads, settings and renders fail. */
  unwritable: string[];
  /** uid:gid the server runs as, null where the platform has none. */
  user: string | null;
}
