import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import type { OutputFormat } from "../../shared/types/wallgrade";
import { saveTarget } from "../../shared/utils/commands";

const execFileAsync = promisify(execFile);

// Loading sharp sets VIPSHOME to its bundled libvips, which sends the vips command
// looking for its modules, among them the AVIF and JXL savers, in the wrong place.
function run(args: string[]) {
  const env = { ...process.env };

  delete env.VIPSHOME;

  return execFileAsync("vips", args, { env });
}

/** The vips command's version, null when it is not installed. */
export async function vipsVersion(): Promise<string | null> {
  try {
    const { stdout } = await run(["--version"]);

    return stdout.replace(/^vips-/, "").trim();
  } catch {
    return null;
  }
}

/**
 * Saves an image in the output format, without an alpha channel. This runs the
 * vips command because the AV1 encoder bundled with sharp uses a single core, which
 * takes ten times as long, and sharp has no JPEG XL. vips reads options from
 * brackets in file names, so both paths must not contain any.
 */
export async function encode(
  input: string,
  output: string,
  format: OutputFormat,
  quality: number,
): Promise<void> {
  // flatten drops the alpha channel lutgen adds, but fails on images without one.
  const { hasAlpha } = await sharp(input).metadata();

  await run([
    hasAlpha ? "flatten" : "copy",
    input,
    saveTarget(output, format, quality),
  ]);
}
