import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { LutSettings } from "../../shared/types/wallgrade";
import { lutArgs } from "../../shared/utils/commands";

const run = promisify(execFile);

let palettes: Promise<string[]> | undefined;
const colors = new Map<string, Promise<string[]>>();
const generating = new Map<string, Promise<string>>();

/** lutgen's version, null when it is not installed. */
export async function lutgenVersion(): Promise<string | null> {
  try {
    const { stdout } = await run("lutgen", ["--version"]);

    return stdout.replace(/^version:\s*/i, "").trim();
  } catch {
    return null;
  }
}

/** The names of lutgen's built-in palettes. */
export function paletteNames(): Promise<string[]> {
  palettes ??= run("lutgen", ["palette", "names"]).then(
    ({ stdout }) =>
      stdout
        .split("\n")
        .map((name) => name.trim())
        .filter(Boolean),
    (error) => {
      // Asked again next time, lutgen may have been installed in the meantime.
      palettes = undefined;

      throw error;
    },
  );

  return palettes;
}

/** A built-in palette's colors as #rrggbb; check the name with paletteNames() first. */
export function paletteColors(name: string): Promise<string[]> {
  let pending = colors.get(name);

  if (!pending) {
    // lutgen prints nothing but the colors, one per line.
    pending = run("lutgen", ["palette", name]).then(({ stdout }) =>
      stdout.split("\n").filter((line) => /^#[\da-f]{6}$/i.test(line)),
    );
    pending.catch(() => colors.delete(name));
    colors.set(name, pending);
  }

  return pending;
}

/** Short name for a LUT, the same for all settings that make the same LUT. */
export function lutKey(lut: LutSettings): string {
  return createHash("sha1")
    .update(lutArgs(lut).join(" "))
    .digest("hex")
    .slice(0, 16);
}

/** The Hald CLUT for these settings, generated on first use and kept in the cache. */
export function haldClut(cacheDir: string, lut: LutSettings): Promise<string> {
  const dir = join(cacheDir, "luts");
  const key = lutKey(lut);
  const file = join(dir, `${key}.png`);
  let pending = generating.get(file);

  if (!pending) {
    pending = (async () => {
      try {
        await access(file);

        return file;
      } catch {
        // Not generated yet.
      }

      const part = join(dir, `${key}.part.png`);

      await mkdir(dir, { recursive: true });
      await run("lutgen", ["generate", ...lutArgs(lut), `--output=${part}`]);
      await rename(part, file);

      return file;
    })().finally(() => generating.delete(file));

    generating.set(file, pending);
  }

  return pending;
}

/** Recolors an image with a Hald CLUT; lutgen always writes RGBA. */
export async function applyLut(
  lut: string,
  input: string,
  output: string,
): Promise<void> {
  await run("lutgen", [
    "apply",
    `--hald-clut=${lut}`,
    input,
    `--output=${output}`,
  ]);
}
