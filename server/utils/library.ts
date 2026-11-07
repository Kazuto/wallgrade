import { createHash } from "node:crypto";
import { mkdir, readdir, rm, stat, unlink } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { createError } from "h3";
import sharp from "sharp";
import type {
  FocusMode,
  FocusPoint,
  ImageOutput,
  LibraryImage,
  LutSettings,
  OutputFormat,
  Size,
} from "../../shared/types/wallgrade";
import { lutArgs } from "../../shared/utils/commands";
import { parseSize } from "../../shared/utils/geometry";
import { renderTemplate, resolveFile } from "../../shared/utils/settings";
import { type Directories, isInside, resolveInside, toApiPath } from "./paths";
import { readState, type State, updateState } from "./state";

/** Formats sharp can read; BMP is not one of them. */
export const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".tif",
  ".tiff",
]);

/** Media types of the sources and outputs, by extension. */
export const MEDIA_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".jxl": "image/jxl",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
};

// Bumped whenever the pipeline changes how outputs look, which makes them all stale.
const PIPELINE_VERSION = 1;

interface SourceInfo extends Size {
  format: string;
  space: string;
  depth: number;
}

export interface SourceFile extends SourceInfo {
  /** Path below the source directory, with forward slashes. */
  path: string;
  /** Absolute path. */
  file: string;
  name: string;
  mtimeMs: number;
  bytes: number;
}

export interface Library {
  state: State;
  sources: SourceFile[];
  images: LibraryImage[];
}

// Reading the header means opening the file, so it is only done again when it changed.
const infos = new Map<string, { mtimeMs: number; info: SourceInfo }>();

export function isImageFile(name: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(name).toLowerCase());
}

/** Format and size as shown, i.e. after applying the EXIF orientation. */
async function sourceInfo(
  file: string,
  mtimeMs: number,
): Promise<SourceInfo | null> {
  const cached = infos.get(file);

  if (cached?.mtimeMs === mtimeMs) {
    return cached.info;
  }

  try {
    const metadata = await sharp(file).metadata();
    const info = {
      width: metadata.autoOrient.width,
      height: metadata.autoOrient.height,
      format: metadata.format,
      space: metadata.space ?? "srgb",
      // libvips names the depth after the C type, e.g. uchar or ushort.
      depth:
        metadata.depth === "ushort" ? 16 : metadata.depth === "float" ? 32 : 8,
    };

    infos.set(file, { mtimeMs, info });

    return info;
  } catch (error) {
    console.warn(`Skipping ${file}: ${(error as Error).message}`);

    return null;
  }
}

/** Reads one source, null when it is no image sharp can open. */
export async function readSource(
  dirs: Directories,
  file: string,
): Promise<SourceFile | null> {
  const info = await stat(file).catch(() => null);

  if (!info?.isFile() || !isImageFile(file)) {
    return null;
  }

  const details = await sourceInfo(file, info.mtimeMs);

  if (!details) {
    return null;
  }

  return {
    path: toApiPath(dirs.source, file),
    file,
    name: basename(file, extname(file)),
    mtimeMs: Math.floor(info.mtimeMs),
    bytes: info.size,
    ...details,
  };
}

/** Every image below the source directory, except hidden files and the output and cache. */
export async function scanSources(dirs: Directories): Promise<SourceFile[]> {
  const files: string[] = [];

  const walk = async (dir: string) => {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const full = join(dir, entry.name);

      if (
        entry.name.startsWith(".") ||
        full === dirs.output ||
        full === dirs.cache
      ) {
        continue;
      }

      // Linked folders are not followed, they could lead in a circle.
      if (entry.isDirectory()) {
        await walk(full);
      } else if (isImageFile(entry.name)) {
        files.push(full);
      }
    }
  };

  await mkdir(dirs.source, { recursive: true });
  await walk(dirs.source);

  const sources = await Promise.all(
    files.map((file) => readSource(dirs, file)),
  );

  return sources
    .filter((source): source is SourceFile => source !== null)
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Everything that decides how one output of a file looks. */
export interface OutputPlan {
  name: string;
  size: string;
  target: Size;
  /** Path below the output directory. */
  file: string;
  lut: LutSettings;
  mode: FocusMode;
  point: FocusPoint | null;
  format: OutputFormat;
  quality: number;
}

/** The outputs a file gets with the current settings and its overrides. */
export function planOutputs(state: State, source: SourceFile): OutputPlan[] {
  const { settings } = state;
  const entry = state.images[source.path];
  const { lut, focus } = resolveFile(settings, entry?.overrides ?? {});

  return settings.outputs
    .filter((output) => output.enabled)
    .map((output) => {
      const target = parseSize(output.size)!;
      const values = {
        name: source.name,
        palette: lut.enabled ? lut.palette : null,
        size: target,
        output: output.name,
      };

      return {
        name: output.name,
        size: output.size,
        target,
        file: renderTemplate(settings.template, values, settings.format),
        lut,
        mode: focus,
        point: entry?.point ?? null,
        format: settings.format,
        quality: settings.quality,
      };
    });
}

/** Changes whenever anything that affects an output changes. */
export function fingerprint(source: SourceFile, plan: OutputPlan): string {
  const input = [
    PIPELINE_VERSION,
    source.mtimeMs,
    source.bytes,
    plan.size,
    plan.lut.enabled ? lutArgs(plan.lut) : null,
    plan.format,
    plan.format === "png" ? null : plan.quality,
    plan.mode,
    // The point only counts while it is used.
    plan.mode === "manual" ? plan.point : null,
  ];

  return createHash("sha1")
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, 16);
}

async function describeOutputs(
  dirs: Directories,
  state: State,
  source: SourceFile,
): Promise<ImageOutput[]> {
  const made = state.images[source.path]?.outputs ?? {};

  return Promise.all(
    planOutputs(state, source).map(async (plan): Promise<ImageOutput> => {
      const info = await stat(join(dirs.output, plan.file)).catch(() => null);
      const output = { name: plan.name, size: plan.size, file: plan.file };

      if (!info) {
        return { ...output, status: "missing", version: 0 };
      }

      return {
        ...output,
        status:
          made[plan.file] === fingerprint(source, plan) ? "done" : "stale",
        version: Math.floor(info.mtimeMs),
      };
    }),
  );
}

/** Sources and the state of their outputs, as the app shows them. */
export async function loadLibrary(dirs: Directories): Promise<Library> {
  const [state, sources] = await Promise.all([
    readState(dirs.source),
    scanSources(dirs),
  ]);

  const images = await Promise.all(
    sources.map(async (source): Promise<LibraryImage> => {
      const entry = state.images[source.path];
      const folder = dirname(source.path);

      return {
        path: source.path,
        name: source.name,
        folder: folder === "." ? "" : folder,
        width: source.width,
        height: source.height,
        format: source.format,
        space: source.space,
        depth: source.depth,
        version: source.mtimeMs,
        point: entry?.point ?? null,
        overrides: entry?.overrides ?? {},
        skip: entry?.skip ?? false,
        outputs: await describeOutputs(dirs, state, source),
        conflict: null,
      };
    }),
  );

  // Two files whose outputs land on the same path would overwrite each other,
  // e.g. equal names in two folders with a template that leaves out the folder.
  const writers = new Map<string, string[]>();

  for (const image of images) {
    for (const output of image.outputs) {
      writers.set(output.file, [
        ...(writers.get(output.file) ?? []),
        image.path,
      ]);
    }
  }

  for (const image of images) {
    image.conflict =
      image.outputs
        .flatMap((output) => writers.get(output.file) ?? [])
        .find((path) => path !== image.path) ?? null;
  }

  return { state, sources, images };
}

/** One source and its library entry, a 404 when the path is no image. */
export async function findImage(dirs: Directories, path: string) {
  const library = await loadLibrary(dirs);
  const index = library.sources.findIndex((source) => source.path === path);

  if (index === -1) {
    throw createError({ statusCode: 404, statusMessage: `${path} not found` });
  }

  return {
    state: library.state,
    source: library.sources[index]!,
    image: library.images[index]!,
  };
}

/**
 * Removes a source, what was rendered from it and its focus point and overrides.
 * Only outputs the state records as made from it go, another file may share a
 * planned path.
 */
export async function deleteSource(
  dirs: Directories,
  path: string,
): Promise<void> {
  const { state, source } = await findImage(dirs, path);
  const rendered = Object.keys(state.images[path]?.outputs ?? {});

  await unlink(source.file);
  await Promise.all(
    rendered.map((file) =>
      rm(resolveInside(dirs.output, file), { force: true }),
    ),
  );
  await updateState(dirs.source, (current) => {
    current.images = Object.fromEntries(
      Object.entries(current.images).filter(([key]) => key !== path),
    );
  });
}

/** Whether a file lies where scanSources() looks for images. */
export function isSourcePath(dirs: Directories, file: string): boolean {
  const hidden = toApiPath(dirs.source, file)
    .split("/")
    .some((segment) => segment.startsWith("."));

  return (
    isInside(dirs.source, file) &&
    !isInside(dirs.output, file) &&
    !isInside(dirs.cache, file) &&
    !hidden &&
    isImageFile(file)
  );
}
