import { stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { loadLibrary, scanSources } from "../../server/utils/library";
import { lutgenVersion } from "../../server/utils/lutgen";
import { autoFocus, convertSource } from "../../server/utils/pipeline";
import { updateState } from "../../server/utils/state";
import { vipsVersion } from "../../server/utils/vips";
import type { Directories } from "../../server/utils/paths";
import { tempDirectories, writeImage } from "./helpers";

// These run the real tools, which a machine without them cannot.
const tools = Boolean((await lutgenVersion()) && (await vipsVersion()));

// A grey picture with a red disc on the right, which attention picks out.
const DISC = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540">
  <rect width="960" height="540" fill="#7f7f7f"/>
  <circle cx="800" cy="270" r="90" fill="#e01b24"/>
</svg>`;

const GREY = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540">
  <rect width="960" height="540" fill="#808080"/>
</svg>`;

async function library(dirs: Directories) {
  const { images } = await loadLibrary(dirs);

  return images[0]!;
}

async function meanColor(file: string) {
  const { channels } = await sharp(file).stats();

  return channels.slice(0, 3).map((channel) => Math.round(channel.mean));
}

describe.skipIf(!tools)("convertSource", { timeout: 30_000 }, () => {
  async function setUp(svg = DISC) {
    const dirs = await tempDirectories();

    await writeImage(join(dirs.source, "wall.png"), 960, 540, svg);
    await updateState(dirs.source, (state) => {
      state.settings.outputs = [
        { name: "Wide", size: "320x90", enabled: true },
        { name: "Tall", size: "90x160", enabled: true },
      ];
      state.settings.format = "png";
    });

    return dirs;
  }

  it("renders every output at its size", async () => {
    const dirs = await setUp();
    const image = await convertSource(dirs, "wall.png", false);

    expect(image.outputs.map((output) => output.status)).toEqual([
      "done",
      "done",
    ]);

    const sizes = await Promise.all(
      image.outputs.map(async (output) => {
        const { width, height, channels } = await sharp(
          join(dirs.output, output.file),
        ).metadata();

        return { file: output.file, size: `${width}x${height}`, channels };
      }),
    );

    expect(sizes).toEqual([
      { file: "320x90-catppuccin-mocha/wall.png", size: "320x90", channels: 3 },
      { file: "90x160-catppuccin-mocha/wall.png", size: "90x160", channels: 3 },
    ]);
  });

  it("only renders what is not done yet", async () => {
    const dirs = await setUp();
    const first = await convertSource(dirs, "wall.png", false);
    const file = join(dirs.output, first.outputs[0]!.file);
    const { mtimeMs } = await stat(file);

    await convertSource(dirs, "wall.png", false);
    expect((await stat(file)).mtimeMs).toBe(mtimeMs);

    await updateState(dirs.source, (state) => {
      state.images["wall.png"]!.point = { x: 0.2, y: 0.5 };
    });
    expect((await library(dirs)).outputs[0]!.status).toBe("stale");

    const again = await convertSource(dirs, "wall.png", false);

    expect(again.outputs[0]!.status).toBe("done");
    expect((await stat(file)).mtimeMs).toBeGreaterThan(mtimeMs);
  });

  it("recolors with the palette", async () => {
    const dirs = await setUp(GREY);
    const graded = await convertSource(dirs, "wall.png", false);

    await updateState(dirs.source, (state) => {
      state.settings.lut.enabled = false;
    });

    const original = await convertSource(dirs, "wall.png", false);

    expect(original.outputs[0]!.file).toBe("320x90-original/wall.png");
    expect(
      await meanColor(join(dirs.output, original.outputs[0]!.file)),
    ).toEqual([128, 128, 128]);

    // Catppuccin's greys are bluer than plain grey.
    const [red, , blue] = await meanColor(
      join(dirs.output, graded.outputs[0]!.file),
    );

    expect(blue! - red!).toBeGreaterThan(10);
  });

  it("crops around the focus point", async () => {
    const dirs = await setUp();

    async function redness(x: number) {
      await updateState(dirs.source, (state) => {
        state.settings.lut.enabled = false;
        state.images["wall.png"] = { point: { x, y: 0.5 } };
      });

      const image = await convertSource(dirs, "wall.png", false);
      const [red, green] = await meanColor(
        join(dirs.output, image.outputs[1]!.file),
      );

      return red! - green!;
    }

    // The tall output shows the disc only with the point on it.
    expect(await redness(800 / 960)).toBeGreaterThan(20);
    expect(await redness(0.1)).toBeLessThan(2);
  });

  it("picks up a source saved over in place", async () => {
    const dirs = await setUp(GREY);

    await updateState(dirs.source, (state) => {
      state.settings.lut.enabled = false;
      state.images["wall.png"] = { point: { x: 800 / 960, y: 0.5 } };
    });
    await convertSource(dirs, "wall.png", false);
    await writeImage(join(dirs.source, "wall.png"), 960, 540, DISC);

    expect((await library(dirs)).outputs[1]!.status).toBe("stale");

    const image = await convertSource(dirs, "wall.png", false);
    const [red, green] = await meanColor(
      join(dirs.output, image.outputs[1]!.file),
    );

    expect(red! - green!).toBeGreaterThan(20);
  });

  it("refuses files whose outputs collide", async () => {
    const dirs = await setUp();

    await writeImage(join(dirs.source, "copy", "wall.png"), 960, 540, DISC);

    await expect(convertSource(dirs, "wall.png", false)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe.skipIf(!tools)("autoFocus", () => {
  it("finds the subject", async () => {
    const dirs = await tempDirectories();

    await writeImage(join(dirs.source, "wall.png"), 960, 540, DISC);

    const [source] = await scanSources(dirs);
    const { attention } = await autoFocus(dirs, source!, {
      width: 1440,
      height: 2560,
    });

    expect(attention.x).toBeGreaterThan(0.7);
    expect(attention.y).toBe(0.5);
  });
});
