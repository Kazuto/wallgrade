import { createHash } from "node:crypto";
import { access, mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { LutSettings } from "../../shared/types/wallgrade";
import type { PreviewWidth } from "../../shared/utils/urls";
import type { SourceFile } from "./library";
import { applyLut, haldClut, lutKey } from "./lutgen";
import type { Directories } from "./paths";

const rendering = new Map<string, Promise<string>>();

/** Renders a cache file once, even when several requests ask for it at the same time. */
function cached(
  dirs: Directories,
  key: string,
  render: (part: string) => Promise<void>,
): Promise<string> {
  const dir = join(dirs.cache, "previews");
  const file = join(dir, `${key}.webp`);
  let pending = rendering.get(file);

  if (!pending) {
    pending = (async () => {
      try {
        await access(file);

        return file;
      } catch {
        // Not rendered yet.
      }

      const part = join(dir, `${key}.part.webp`);

      await mkdir(dir, { recursive: true });
      await render(part);
      await rename(part, file);

      return file;
    })().finally(() => rendering.delete(file));

    rendering.set(file, pending);
  }

  return pending;
}

/** A WebP copy of a source for the browser, rendered once per version and width. */
export function renderPreview(
  dirs: Directories,
  source: SourceFile,
  width: PreviewWidth,
): Promise<string> {
  const key = createHash("sha1")
    .update(`${source.file}\0${source.mtimeMs}\0${width}`)
    .digest("hex");

  return cached(dirs, key, async (part) => {
    // Portrait sources get the same limit on their height.
    await sharp(source.file)
      .autoOrient()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(part);
  });
}

/** The preview recolored with a LUT, i.e. roughly what the outputs will look like. */
export async function renderGradedPreview(
  dirs: Directories,
  source: SourceFile,
  width: PreviewWidth,
  lut: LutSettings,
): Promise<string> {
  const preview = await renderPreview(dirs, source, width);
  const key = createHash("sha1")
    .update(`${preview}\0${lutKey(lut)}`)
    .digest("hex");

  return cached(dirs, key, async (part) => {
    const graded = `${part}.png`;

    try {
      await applyLut(await haldClut(dirs.cache, lut), preview, graded);
      await sharp(graded).flatten().webp({ quality: 82 }).toFile(part);
    } finally {
      await rm(graded, { force: true });
    }
  });
}
