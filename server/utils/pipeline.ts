import { copyFile, mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { createError } from "h3";
import sharp from "sharp";
import type {
  AutoFocus,
  FocusPoint,
  LibraryImage,
  Size,
} from "../../shared/types/wallgrade";
import { coverCrop, cropCenter, formatSize } from "../../shared/utils/geometry";
import { focusPointFor } from "../../shared/utils/settings";
import {
  findImage,
  fingerprint,
  type OutputPlan,
  planOutputs,
  type SourceFile,
} from "./library";
import { applyLut, haldClut } from "./lutgen";
import { type Directories, resolveInside } from "./paths";
import { renderPreview } from "./preview";
import { updateState } from "./state";
import { encode } from "./vips";

// lutgen and the encoders use every core already; more at once only adds waiting.
const MAX_CONVERSIONS = 2;

const autoFocusCache = new Map<string, Promise<AutoFocus>>();
let running = 0;
const waiting: (() => void)[] = [];

/** Where a strategy puts the crop window within an image, as a focus point. */
async function strategyFocus(
  file: string,
  image: Size,
  target: Size,
  strategy: "attention" | "entropy",
): Promise<FocusPoint> {
  // The window only has to fit the image, its own size does not matter.
  const scale = Math.min(
    1,
    image.width / target.width,
    image.height / target.height,
  );
  const width = Math.max(1, Math.round(target.width * scale));
  const height = Math.max(1, Math.round(target.height * scale));

  const { info } = await sharp(file)
    .resize({ width, height, fit: "cover", position: sharp.strategy[strategy] })
    .toBuffer({ resolveWithObject: true });

  // The size the image was scaled to before cropping; the offsets point into it
  // and are negative.
  const cover = Math.max(width / image.width, height / image.height);
  const resized = {
    width: Math.round(image.width * cover),
    height: Math.round(image.height * cover),
  };

  return cropCenter(resized, {
    x: -(info.cropOffsetLeft ?? 0),
    y: -(info.cropOffsetTop ?? 0),
    width,
    height,
  });
}

/**
 * Where attention and entropy crop a source for a size. They look at the small
 * preview, which finds the subject as well as the full image and keeps the overlays
 * in the browser and the outputs in agreement.
 */
export function autoFocus(
  dirs: Directories,
  source: SourceFile,
  target: Size,
): Promise<AutoFocus> {
  const key = `${source.file}\0${source.mtimeMs}\0${formatSize(target)}`;
  let pending = autoFocusCache.get(key);

  if (!pending) {
    pending = (async () => {
      const preview = await renderPreview(dirs, source, 480);
      const { width, height } = await sharp(preview).metadata();
      const size = { width, height };

      const [attention, entropy] = await Promise.all([
        strategyFocus(preview, size, target, "attention"),
        strategyFocus(preview, size, target, "entropy"),
      ]);

      return { attention, entropy };
    })();

    // A failure is not remembered, the next request tries again.
    pending.catch(() => autoFocusCache.delete(key));
    autoFocusCache.set(key, pending);
  }

  return pending;
}

/** Runs task once fewer than MAX_CONVERSIONS others are running. */
async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONVERSIONS) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }

  running++;

  try {
    return await task();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

export interface ConvertOptions {
  source: SourceFile;
  plan: OutputPlan;
  focus: FocusPoint;
  /** Hald CLUT from haldClut(), null to keep the colors. */
  lut: string | null;
  /** File to write. */
  output: string;
  /** Directory for intermediate files, removed afterwards. */
  workDir: string;
}

/** Crops one source around the focus point, recolors it and saves it. */
export async function convertImage(options: ConvertOptions): Promise<void> {
  const { source, plan, focus, lut, output, workDir } = options;
  const crop = coverCrop(source, plan.target, focus);
  const cropped = join(workDir, "cropped.png");
  const graded = join(workDir, "graded.png");
  // Encoded in the work directory, whose path has no brackets that vips would read
  // as options, unlike file names may.
  const encoded = join(workDir, `encoded.${plan.format}`);
  // The final name only appears once the file is complete.
  const part = `${output.slice(0, -extname(output).length)}.part${extname(output)}`;

  await mkdir(dirname(output), { recursive: true });

  try {
    // Cropping first leaves lutgen only the pixels that are kept.
    await sharp(source.file)
      .autoOrient()
      .extract({
        left: crop.x,
        top: crop.y,
        width: crop.width,
        height: crop.height,
      })
      .resize(plan.target.width, plan.target.height, { fit: "fill" })
      .png({ compressionLevel: 1 })
      .toFile(cropped);

    if (lut) {
      await applyLut(lut, cropped, graded);
    }

    await encode(lut ? graded : cropped, encoded, plan.format, plan.quality);
    // Copied, the output may be on another file system than the cache.
    await copyFile(encoded, part);
    await rename(part, output);
  } finally {
    await rm(part, { force: true });
  }
}

/**
 * Renders every output of one source that is not done yet, or all of them with
 * force, and records what each was made from.
 */
export async function convertSource(
  dirs: Directories,
  path: string,
  force: boolean,
): Promise<LibraryImage> {
  const { state, source, image } = await findImage(dirs, path);

  if (image.conflict) {
    throw createError({
      statusCode: 409,
      statusMessage: `${path} and ${image.conflict} would be written to the same file`,
    });
  }

  const done = new Set(
    image.outputs
      .filter((output) => output.status === "done")
      .map((output) => output.file),
  );
  const plans = planOutputs(state, source).filter(
    (plan) => force || !done.has(plan.file),
  );

  await mkdir(join(dirs.cache, "work"), { recursive: true });

  for (const plan of plans) {
    const lut = plan.lut.enabled ? await haldClut(dirs.cache, plan.lut) : null;
    const auto =
      plan.mode === "manual" && plan.point
        ? undefined
        : await autoFocus(dirs, source, plan.target);
    const workDir = await mkdtemp(join(dirs.cache, "work", "convert-"));

    try {
      await withSlot(() =>
        convertImage({
          source,
          plan,
          focus: focusPointFor(plan.mode, plan.point, auto),
          lut,
          output: resolveInside(dirs.output, plan.file),
          workDir,
        }),
      );
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }

    // The fingerprint describes what the output was made from; a point moved
    // meanwhile leaves it stale, as it should.
    await updateState(dirs.source, (current) => {
      const entry = (current.images[path] ??= {});

      entry.outputs = {
        ...entry.outputs,
        [plan.file]: fingerprint(source, plan),
      };
    });
  }

  return (await findImage(dirs, path)).image;
}
