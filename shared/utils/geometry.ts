import type { FocusPoint, Rect, Size } from "../types/wallgrade";

const SIZE = /^([1-9]\d*)x([1-9]\d*)$/;
const MONITOR = /^([1-9]\d*)x([1-9]\d*)\+(\d+)\+(\d+)$/;

export const CENTER: FocusPoint = { x: 0.5, y: 0.5 };

/** Reads a size like 3440x1440, null when it is not one. */
export function parseSize(value: string): Size | null {
  const match = SIZE.exec(value.trim());

  if (!match) {
    return null;
  }

  return { width: Number(match[1]), height: Number(match[2]) };
}

/** Reads a monitor like 1440x2560+4880+0, null when it is not one. */
export function parseMonitor(value: string): Rect | null {
  const match = MONITOR.exec(value.trim());

  if (!match) {
    return null;
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
    x: Number(match[3]),
    y: Number(match[4]),
  };
}

export function formatSize(size: Size): string {
  return `${size.width}x${size.height}`;
}

/** The smallest box around all rects, starting at 0,0 like a desktop does. */
export function boundingBox(rects: Rect[]): Size {
  return {
    width: Math.max(0, ...rects.map((rect) => rect.x + rect.width)),
    height: Math.max(0, ...rects.map((rect) => rect.y + rect.height)),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The part of the source that fills the target when the source is scaled to cover
 * it, centered on the focus point as far as the edges allow. Only one axis is ever
 * cropped, so a single point serves wide and tall targets alike.
 */
export function coverCrop(source: Size, target: Size, focus: FocusPoint): Rect {
  const scale = Math.max(
    target.width / source.width,
    target.height / source.height,
  );

  const width = Math.min(source.width, Math.round(target.width / scale));
  const height = Math.min(source.height, Math.round(target.height / scale));

  return {
    x: clamp(
      Math.round(focus.x * source.width - width / 2),
      0,
      source.width - width,
    ),
    y: clamp(
      Math.round(focus.y * source.height - height / 2),
      0,
      source.height - height,
    ),
    width,
    height,
  };
}

/** The focus point that reproduces a crop, i.e. its center. */
export function cropCenter(source: Size, crop: Rect): FocusPoint {
  return {
    x: (crop.x + crop.width / 2) / source.width,
    y: (crop.y + crop.height / 2) / source.height,
  };
}
