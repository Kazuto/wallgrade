import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach } from "vitest";
import sharp from "sharp";
import type { Directories } from "../../server/utils/paths";

// libvips caches stats() by file name, and tests measure outputs they overwrote.
sharp.cache(false);

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

/** Empty source, output and cache directories, removed after the test. */
export async function tempDirectories(): Promise<Directories> {
  const root = await mkdtemp(join(tmpdir(), "wallgrade-"));

  roots.push(root);

  const source = join(root, "source");

  // Output and cache lie inside the source, as by default, so scans must skip them.
  return {
    source,
    output: join(source, "output"),
    cache: join(source, ".cache"),
  };
}

/** Writes a PNG, by default a plain grey one. */
export async function writeImage(
  file: string,
  width: number,
  height: number,
  svg?: string,
): Promise<void> {
  await mkdir(dirname(file), { recursive: true });

  const image = svg
    ? sharp(Buffer.from(svg))
    : sharp({
        create: { width, height, channels: 3, background: "#808080" },
      });

  await image.png().toFile(file);
}
