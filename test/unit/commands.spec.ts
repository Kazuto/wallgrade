import { describe, expect, it } from "vitest";
import {
  lutArgs,
  pipelineCommands,
  saveTarget,
  shellQuote,
} from "../../shared/utils/commands";
import { DEFAULT_LUT } from "../../shared/utils/settings";

describe("lutArgs", () => {
  it("passes lutgen's default algorithm without a flag", () => {
    expect(lutArgs(DEFAULT_LUT)).toEqual([
      "--palette=catppuccin-mocha",
      "--radius=8",
      "--level=10",
      "--lum=0.7",
    ]);
  });

  it.each([
    ["gaussian-rbf", ["--gaussian-rbf", "--shape=128", "--nearest=16"]],
    ["shepards-method", ["--shepards-method", "--power=4", "--nearest=16"]],
    ["nearest-neighbor", ["--nearest-neighbor"]],
  ] as const)("passes only the options of %s", (algorithm, options) => {
    expect(lutArgs({ ...DEFAULT_LUT, algorithm })).toEqual([
      "--palette=catppuccin-mocha",
      ...options,
      "--level=10",
      "--lum=0.7",
    ]);
  });

  it("adds --preserve when asked", () => {
    expect(lutArgs({ ...DEFAULT_LUT, preserve: true }).at(-1)).toBe(
      "--preserve",
    );
  });
});

describe("shellQuote", () => {
  it.each([
    ["wall-03.png", "wall-03.png"],
    ["--palette=nord", "--palette=nord"],
    ["my wall.png", "'my wall.png'"],
    ["out.avif[Q=75]", "'out.avif[Q=75]'"],
    ["it's.png", `'it'\\''s.png'`],
  ])("%j becomes %s", (arg, quoted) => {
    expect(shellQuote(arg)).toBe(quoted);
  });
});

describe("saveTarget", () => {
  it("adds the quality for lossy formats only", () => {
    expect(saveTarget("a.avif", "avif", 60)).toBe("a.avif[Q=60]");
    expect(saveTarget("a.png", "png", 60)).toBe("a.png");
  });
});

describe("pipelineCommands", () => {
  const input = {
    source: "wall.jpg",
    output: "wall.avif",
    crop: { x: 0, y: 519, width: 3840, height: 1555 },
    size: { width: 6320, height: 2560 },
    lut: DEFAULT_LUT,
    format: "avif" as const,
    quality: 75,
  };

  it("crops, scales, recolors and encodes", () => {
    expect(pipelineCommands(input).map((command) => command.join(" "))).toEqual(
      [
        "lutgen generate --palette=catppuccin-mocha --radius=8 --level=10 --lum=0.7 --output=lut.png",
        "vips extract_area wall.jpg crop.png 0 519 3840 1555",
        "vips thumbnail crop.png sized.png 6320 --height 2560 --size force",
        "lutgen apply --hald-clut=lut.png sized.png --output=graded.png",
        "vips flatten graded.png wall.avif[Q=75]",
      ],
    );
  });

  it("skips lutgen when the LUT is off", () => {
    const commands = pipelineCommands({
      ...input,
      lut: { ...DEFAULT_LUT, enabled: false },
      format: "png",
    });

    expect(commands.map((command) => command[0])).toEqual([
      "vips",
      "vips",
      "vips",
    ]);
    expect(commands.at(-1)).toEqual(["vips", "copy", "sized.png", "wall.avif"]);
  });
});
