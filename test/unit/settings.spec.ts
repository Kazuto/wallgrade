import { describe, expect, it } from "vitest";
import { CENTER } from "../../shared/utils/geometry";
import {
  aspectLabel,
  DEFAULT_SETTINGS,
  focusPointFor,
  hasOverrides,
  lutSummary,
  monitorsFor,
  paletteLabel,
  renderTemplate,
  resolveFile,
  settingsSchema,
  templateProblem,
} from "../../shared/utils/settings";

const ULTRAWIDE = { width: 3440, height: 1440 };
const MONITORS = ["1440x2560+0+0", "3440x1440+1440+640", "1440x2560+4880+0"];

describe("renderTemplate", () => {
  const values = {
    name: "wall-03",
    palette: "catppuccin-mocha",
    size: ULTRAWIDE,
    output: "Ultrawide 21:9",
  };

  it("fills the default template", () => {
    expect(renderTemplate(DEFAULT_SETTINGS.template, values, "avif")).toBe(
      "3440x1440-catppuccin-mocha/wall-03.avif",
    );
  });

  it("names outputs without a LUT original", () => {
    expect(
      renderTemplate("{name}-{palette}", { ...values, palette: null }, "png"),
    ).toBe("wall-03-original.png");
  });

  it("slugs the output name", () => {
    expect(renderTemplate("{output}/{name}", values, "jxl")).toBe(
      "ultrawide-21-9/wall-03.jxl",
    );
  });

  it("replaces every occurrence", () => {
    expect(renderTemplate("{w}/{name}-{w}", values, "webp")).toBe(
      "3440/wall-03-3440.webp",
    );
  });
});

describe("templateProblem", () => {
  it.each([
    DEFAULT_SETTINGS.template,
    "{name}-{palette}-{w}x{h}",
    "{output}/{name}",
  ])("accepts %j", (template) => {
    expect(templateProblem(template)).toBeNull();
  });

  it.each([
    ["{w}x{h}", /needs \{name\}/],
    ["{palette}/{name}", /\{w\}, \{h\} or \{output\}/],
    ["../{name}-{w}", /can't be empty/],
    ["{w}//{name}", /can't be empty/],
    ["/{name}-{w}", /can't be empty/],
  ])("refuses %j", (template, problem) => {
    expect(templateProblem(template)).toMatch(problem);
  });
});

describe("settingsSchema", () => {
  it("accepts the defaults", () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
  });

  it("refuses two outputs of the same size", () => {
    const result = settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      outputs: [
        { name: "One", size: "3440x1440", enabled: true },
        { name: "Two", size: "3440x1440", enabled: false },
      ],
    });

    expect(result.error?.issues[0]?.message).toBe(
      "Every output needs its own size",
    );
  });

  it("refuses an unusable template", () => {
    const result = settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      template: "{w}x{h}",
    });

    expect(result.success).toBe(false);
  });

  it("refuses palette names that could be options", () => {
    const result = settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      lut: { ...DEFAULT_SETTINGS.lut, palette: "nord --output=/etc" },
    });

    expect(result.success).toBe(false);
  });
});

describe("resolveFile", () => {
  it("lays a file's overrides over the batch settings", () => {
    const file = resolveFile(DEFAULT_SETTINGS, {
      lut: { palette: "nord" },
      focus: "entropy",
    });

    expect(file.lut).toEqual({ ...DEFAULT_SETTINGS.lut, palette: "nord" });
    expect(file.focus).toBe("entropy");
  });

  it("uses the batch settings without overrides", () => {
    expect(resolveFile(DEFAULT_SETTINGS, {})).toEqual({
      lut: DEFAULT_SETTINGS.lut,
      focus: DEFAULT_SETTINGS.focus,
    });
  });
});

describe("hasOverrides", () => {
  it.each([
    [{}, false],
    [{ lut: {} }, false],
    [{ lut: { luminosity: 1 } }, true],
    [{ focus: "centre" as const }, true],
  ])("%j is %s", (overrides, expected) => {
    expect(hasOverrides(overrides)).toBe(expected);
  });
});

describe("focusPointFor", () => {
  const point = { x: 0.2, y: 0.3 };
  const auto = { attention: { x: 0.7, y: 0.4 }, entropy: { x: 0.1, y: 0.9 } };

  it.each([
    ["manual", point, auto, point],
    ["manual", null, auto, auto.attention],
    ["manual", null, undefined, CENTER],
    ["centre", point, auto, CENTER],
    ["attention", point, auto, auto.attention],
    ["entropy", point, auto, auto.entropy],
    ["entropy", point, undefined, CENTER],
  ] as const)("%s with %j and %j", (mode, given, found, expected) => {
    expect(focusPointFor(mode, given, found)).toEqual(expected);
  });
});

describe("monitorsFor", () => {
  it("returns the monitors an output spans", () => {
    expect(
      monitorsFor(MONITORS, { width: 6320, height: 2560 }).map(
        (monitor) => monitor.x,
      ),
    ).toEqual([0, 1440, 4880]);
  });

  it("returns none for an output of another size", () => {
    expect(monitorsFor(MONITORS, ULTRAWIDE)).toEqual([]);
  });

  it("ignores lines that are no monitors", () => {
    expect(monitorsFor(["nonsense"], ULTRAWIDE)).toEqual([]);
  });
});

describe("aspectLabel", () => {
  it.each([
    [ULTRAWIDE, "21:9"],
    [{ width: 2560, height: 1440 }, "16:9"],
    [{ width: 1440, height: 2560 }, "9:16"],
    [{ width: 1920, height: 1200 }, "16:10"],
    [{ width: 5120, height: 1440 }, "32:9"],
    [{ width: 6320, height: 2560 }, "2.47:1"],
    [{ width: 1000, height: 3000 }, "1:3.00"],
  ])("%j is %s", (size, label) => {
    expect(aspectLabel(size)).toBe(label);
  });
});

describe("labels", () => {
  it("titles palette names", () => {
    expect(paletteLabel("everforest-dark-medium")).toBe(
      "Everforest Dark Medium",
    );
  });

  it("summarises only the chosen algorithm's parameters", () => {
    expect(lutSummary(DEFAULT_SETTINGS.lut)).toBe(
      "Gaussian blur · radius 8 · lum 0.70",
    );
    expect(
      lutSummary({ ...DEFAULT_SETTINGS.lut, algorithm: "nearest-neighbor" }),
    ).toBe("Nearest neighbor · lum 0.70");
  });
});
