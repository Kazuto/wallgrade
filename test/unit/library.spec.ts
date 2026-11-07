import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  deleteSource,
  fingerprint,
  isSourcePath,
  loadLibrary,
  planOutputs,
  scanSources,
  type SourceFile,
} from "../../server/utils/library";
import { readState, type State, updateState } from "../../server/utils/state";
import { DEFAULT_SETTINGS } from "../../shared/utils/settings";
import { tempDirectories, writeImage } from "./helpers";

const SOURCE: SourceFile = {
  path: "bleach/wall.png",
  file: "/srv/wallpapers/bleach/wall.png",
  name: "wall",
  width: 3840,
  height: 2160,
  format: "png",
  space: "srgb",
  depth: 8,
  mtimeMs: 1,
  bytes: 1000,
};

function state(change: (state: State) => void = () => {}): State {
  const result: State = {
    settings: structuredClone(DEFAULT_SETTINGS),
    images: {},
    presets: {},
  };

  change(result);

  return result;
}

describe("scanSources", () => {
  it("finds images, but not hidden files, outputs or the cache", async () => {
    const dirs = await tempDirectories();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await writeImage(join(dirs.source, "b.png"), 40, 20);
    await writeImage(join(dirs.source, "bleach", "a.png"), 20, 40);
    await writeImage(join(dirs.source, ".hidden.png"), 10, 10);
    await writeImage(join(dirs.source, "output", "c.png"), 10, 10);
    await writeImage(join(dirs.source, ".cache", "d.png"), 10, 10);
    await writeFile(join(dirs.source, "notes.txt"), "not an image");
    await writeFile(join(dirs.source, "broken.png"), "not an image either");

    const sources = await scanSources(dirs);

    expect(
      sources.map(({ path, name, width, height, format }) => ({
        path,
        name,
        width,
        height,
        format,
      })),
    ).toEqual([
      { path: "b.png", name: "b", width: 40, height: 20, format: "png" },
      { path: "bleach/a.png", name: "a", width: 20, height: 40, format: "png" },
    ]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("creates the source directory", async () => {
    expect(await scanSources(await tempDirectories())).toEqual([]);
  });
});

describe("planOutputs", () => {
  it("plans every enabled output", () => {
    const plans = planOutputs(
      state((value) => {
        value.settings.outputs[1]!.enabled = true;
      }),
      SOURCE,
    );

    expect(plans.map((plan) => plan.file)).toEqual([
      "3440x1440-catppuccin-mocha/wall.avif",
      "2560x1440-catppuccin-mocha/wall.avif",
    ]);
  });

  it("uses the file's overrides", () => {
    const [plan] = planOutputs(
      state((value) => {
        value.images[SOURCE.path] = {
          point: { x: 0.1, y: 0.2 },
          overrides: { lut: { palette: "nord" }, focus: "entropy" },
        };
      }),
      SOURCE,
    );

    expect(plan).toMatchObject({
      file: "3440x1440-nord/wall.avif",
      mode: "entropy",
      point: { x: 0.1, y: 0.2 },
    });
    expect(plan!.lut.palette).toBe("nord");
  });

  it("names outputs without a LUT original", () => {
    const [plan] = planOutputs(
      state((value) => {
        value.settings.lut.enabled = false;
      }),
      SOURCE,
    );

    expect(plan!.file).toBe("3440x1440-original/wall.avif");
  });
});

describe("fingerprint", () => {
  const print = (change: (state: State) => void) =>
    fingerprint(SOURCE, planOutputs(state(change), SOURCE)[0]!);

  const base = print(() => {});

  it.each<[string, (state: State) => void]>([
    [
      "the point",
      (value) => {
        value.images[SOURCE.path] = { point: { x: 0.1, y: 0.2 } };
      },
    ],
    [
      "the palette",
      (value) => {
        value.settings.lut.palette = "nord";
      },
    ],
    [
      "an option of the algorithm",
      (value) => {
        value.settings.lut.radius = 4;
      },
    ],
    [
      "the quality",
      (value) => {
        value.settings.quality = 60;
      },
    ],
    [
      "the focus mode",
      (value) => {
        value.settings.focus = "entropy";
      },
    ],
  ])("changes with %s", (_, change) => {
    expect(print(change)).not.toBe(base);
  });

  const centre = (value: State) => {
    value.settings.focus = "centre";
  };

  it.each<[string, (state: State) => void, (state: State) => void]>([
    [
      "the point while a strategy picks it",
      centre,
      (value) => {
        centre(value);
        value.images[SOURCE.path] = { point: { x: 0.1, y: 0.2 } };
      },
    ],
    [
      "an option of another algorithm",
      () => {},
      (value) => {
        value.settings.lut.shape = 64;
      },
    ],
    [
      "being skipped",
      () => {},
      (value) => {
        value.images[SOURCE.path] = { skip: true };
      },
    ],
  ])("ignores %s", (_, before, after) => {
    expect(print(after)).toBe(print(before));
  });

  it("ignores the quality of PNGs", () => {
    const png = (quality: number) =>
      print((value) => {
        value.settings.format = "png";
        value.settings.quality = quality;
      });

    expect(png(10)).toBe(png(90));
  });
});

describe("loadLibrary", () => {
  it("reports missing outputs and the file's state", async () => {
    const dirs = await tempDirectories();

    await writeImage(join(dirs.source, "wall.png"), 64, 36);
    await updateState(dirs.source, (value) => {
      value.images["wall.png"] = { point: { x: 0.3, y: 0.6 }, skip: true };
    });

    const { images } = await loadLibrary(dirs);

    expect(images).toMatchObject([
      {
        path: "wall.png",
        folder: "",
        point: { x: 0.3, y: 0.6 },
        skip: true,
        conflict: null,
        outputs: [
          {
            name: "Ultrawide",
            file: "3440x1440-catppuccin-mocha/wall.avif",
            status: "missing",
            version: 0,
          },
        ],
      },
    ]);
  });

  it("tells done outputs from stale ones", async () => {
    const dirs = await tempDirectories();

    await writeImage(join(dirs.source, "wall.png"), 64, 36);

    const [source] = await scanSources(dirs);
    const [plan] = planOutputs(await readState(dirs.source), source!);

    await mkdir(join(dirs.output, "3440x1440-catppuccin-mocha"), {
      recursive: true,
    });
    await writeFile(join(dirs.output, plan!.file), "");
    await updateState(dirs.source, (value) => {
      value.images["wall.png"] = {
        outputs: { [plan!.file]: fingerprint(source!, plan!) },
      };
    });

    const status = async () =>
      (await loadLibrary(dirs)).images[0]!.outputs[0]!.status;

    expect(await status()).toBe("done");

    await updateState(dirs.source, (value) => {
      value.settings.quality = 40;
    });

    expect(await status()).toBe("stale");
  });

  it("flags files whose outputs would overwrite each other", async () => {
    const dirs = await tempDirectories();

    await writeImage(join(dirs.source, "a", "wall.png"), 64, 36);
    await writeImage(join(dirs.source, "b", "wall.png"), 64, 36);
    await writeImage(join(dirs.source, "b", "other.png"), 64, 36);

    const conflicts = async () =>
      Object.fromEntries(
        (await loadLibrary(dirs)).images.map((image) => [
          image.path,
          image.conflict,
        ]),
      );

    expect(await conflicts()).toEqual({
      "a/wall.png": "b/wall.png",
      "b/other.png": null,
      "b/wall.png": "a/wall.png",
    });

    // A palette of its own sends one of them to another folder.
    await updateState(dirs.source, (value) => {
      value.images["a/wall.png"] = { overrides: { lut: { palette: "nord" } } };
    });

    expect(await conflicts()).toEqual({
      "a/wall.png": null,
      "b/other.png": null,
      "b/wall.png": null,
    });
  });
});

describe("deleteSource", () => {
  const exists = (file: string) =>
    access(file).then(
      () => true,
      () => false,
    );

  it("removes the file, what was rendered from it and its entry", async () => {
    const dirs = await tempDirectories();

    for (const file of ["a.png", "b.png"]) {
      await writeImage(join(dirs.source, file), 64, 36);
    }

    for (const file of ["x/a.avif", "x/b.avif"]) {
      await writeImage(join(dirs.output, file), 8, 8);
    }

    await updateState(dirs.source, (state) => {
      state.images["a.png"] = {
        point: { x: 0.1, y: 0.2 },
        outputs: { "x/a.avif": "made" },
      };
      state.images["b.png"] = {
        point: { x: 0.1, y: 0.2 },
        outputs: { "x/b.avif": "made" },
      };
    });

    await deleteSource(dirs, "a.png");

    expect(await exists(join(dirs.source, "a.png"))).toBe(false);
    expect(await exists(join(dirs.output, "x/a.avif"))).toBe(false);
    expect(await exists(join(dirs.output, "x/b.avif"))).toBe(true);
    expect(Object.keys((await readState(dirs.source)).images)).toEqual([
      "b.png",
    ]);
  });

  it.each(["missing.png", "../a.png", "output/x/a.avif", ".wallgrade.json"])(
    "refuses %j",
    async (path) => {
      const dirs = await tempDirectories();

      await writeImage(join(dirs.source, "a.png"), 64, 36);
      await writeImage(join(dirs.output, "x/a.avif"), 8, 8);

      await expect(deleteSource(dirs, path)).rejects.toMatchObject({
        statusCode: 404,
      });
    },
  );
});

describe("isSourcePath", () => {
  const dirs = {
    source: "/srv/wallpapers",
    output: "/srv/wallpapers/output",
    cache: "/srv/wallpapers/.cache",
  };

  it.each([
    ["/srv/wallpapers/a.png", true],
    ["/srv/wallpapers/bleach/a.JPG", true],
    ["/srv/wallpapers/a.txt", false],
    ["/srv/wallpapers/.hidden/a.png", false],
    ["/srv/wallpapers/output/a.png", false],
    ["/srv/wallpapers/.cache/a.png", false],
    ["/srv/other/a.png", false],
  ])("%s is %s", (file, expected) => {
    expect(isSourcePath(dirs, file)).toBe(expected);
  });
});
