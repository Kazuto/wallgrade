import { z } from "zod";
import type {
  AutoFocus,
  FileOverrides,
  FocusMode,
  FocusPoint,
  LutAlgorithm,
  LutSettings,
  OutputFormat,
  Rect,
  Settings,
  Size,
} from "../types/wallgrade";
import { boundingBox, CENTER, parseMonitor, parseSize } from "./geometry";

export const LUT_ALGORITHMS: { value: LutAlgorithm; label: string }[] = [
  { value: "gaussian-blur", label: "Gaussian blur" },
  { value: "gaussian-rbf", label: "Gaussian RBF" },
  { value: "shepards-method", label: "Shepard's method" },
  { value: "nearest-neighbor", label: "Nearest neighbor" },
];

export const FOCUS_MODES: { value: FocusMode; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "centre", label: "Centre" },
  { value: "attention", label: "Attention" },
  { value: "entropy", label: "Entropy" },
];

export const OUTPUT_FORMATS: {
  value: OutputFormat;
  label: string;
  lossy: boolean;
}[] = [
  { value: "png", label: "PNG", lossy: false },
  { value: "jpg", label: "JPG", lossy: true },
  { value: "webp", label: "WEBP", lossy: true },
  { value: "avif", label: "AVIF", lossy: true },
  { value: "jxl", label: "JXL", lossy: true },
];

export const TEMPLATE_TOKENS = [
  "{name}",
  "{palette}",
  "{w}",
  "{h}",
  "{output}",
];

// lutgen's own defaults, except for the luminosity, which keeps more color.
export const DEFAULT_LUT: LutSettings = {
  enabled: true,
  palette: "catppuccin-mocha",
  algorithm: "gaussian-blur",
  radius: 8,
  shape: 128,
  power: 4,
  nearest: 16,
  level: 10,
  luminosity: 0.7,
  preserve: false,
};

export const DEFAULT_SETTINGS: Settings = {
  outputs: [
    { name: "Ultrawide", size: "3440x1440", enabled: true },
    { name: "QHD", size: "2560x1440", enabled: false },
    { name: "4K", size: "3840x2160", enabled: false },
    { name: "Portrait", size: "1440x2560", enabled: false },
  ],
  monitors: [],
  lut: DEFAULT_LUT,
  focus: "manual",
  format: "avif",
  quality: 75,
  // One folder per size and palette, as wallpaper pickers list folders.
  template: "{w}x{h}-{palette}/{name}",
};

export const lutSchema = z.object({
  enabled: z.boolean(),
  palette: z.string().regex(/^[\w.+-]+$/, { error: "Unknown palette" }),
  algorithm: z.enum(LUT_ALGORITHMS.map((algorithm) => algorithm.value)),
  radius: z.number().positive().max(64),
  shape: z.number().positive().max(1024),
  power: z.number().positive().max(64),
  nearest: z.number().int().min(0).max(256),
  level: z.number().int().min(2).max(16),
  luminosity: z.number().positive().max(2),
  preserve: z.boolean(),
});

export const focusModeSchema = z.enum(FOCUS_MODES.map((mode) => mode.value));

export const outputPresetSchema = z.object({
  name: z.string().trim().min(1, { error: "Name the output" }).max(40),
  size: z.string().refine((value) => parseSize(value) !== null, {
    error: "Sizes look like 3440x1440",
  }),
  enabled: z.boolean(),
});

export const settingsSchema = z.object({
  outputs: z
    .array(outputPresetSchema)
    .min(1, { error: "Add at least one output" })
    .refine(
      (outputs) =>
        new Set(outputs.map((output) => output.size)).size === outputs.length,
      { error: "Every output needs its own size" },
    ),
  monitors: z.array(
    z.string().refine((value) => parseMonitor(value) !== null, {
      error: "Monitors look like 1440x2560+0+0",
    }),
  ),
  lut: lutSchema,
  focus: focusModeSchema,
  format: z.enum(OUTPUT_FORMATS.map((format) => format.value)),
  quality: z.number().int().min(1).max(100),
  template: z.string().superRefine((template, context) => {
    const problem = templateProblem(template);

    if (problem) {
      context.addIssue({ code: "custom", message: problem });
    }
  }),
});

export const overridesSchema = z.object({
  lut: lutSchema.partial().optional(),
  focus: focusModeSchema.optional(),
});

export const focusSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

/** The settings one file is rendered with. */
export function resolveFile(settings: Settings, overrides: FileOverrides) {
  return {
    lut: { ...settings.lut, ...overrides.lut },
    focus: overrides.focus ?? settings.focus,
  };
}

/** Whether a file changes any batch setting. */
export function hasOverrides(overrides: FileOverrides): boolean {
  return (
    overrides.focus !== undefined || Object.keys(overrides.lut ?? {}).length > 0
  );
}

/** Where a size is cropped: the file's point, the middle or a strategy's choice. */
export function focusPointFor(
  mode: FocusMode,
  point: FocusPoint | null,
  auto: AutoFocus | undefined,
): FocusPoint {
  switch (mode) {
    case "manual":
      // Files without a point start where attention would crop.
      return point ?? auto?.attention ?? CENTER;
    case "centre":
      return CENTER;
    case "attention":
      return auto?.attention ?? CENTER;
    case "entropy":
      return auto?.entropy ?? CENTER;
  }
}

/** Monitors that together cover exactly this size, otherwise none. */
export function monitorsFor(monitors: string[], size: Size): Rect[] {
  const rects = monitors
    .map(parseMonitor)
    .filter((rect): rect is Rect => rect !== null);

  if (rects.length === 0) {
    return [];
  }

  const box = boundingBox(rects);

  return box.width === size.width && box.height === size.height ? rects : [];
}

/** catppuccin-mocha becomes Catppuccin Mocha. */
export function paletteLabel(palette: string): string {
  return palette
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function algorithmLabel(algorithm: LutAlgorithm): string {
  return (
    LUT_ALGORITHMS.find((option) => option.value === algorithm)?.label ??
    algorithm
  );
}

/** The parameters that matter for the chosen algorithm, e.g. Gaussian blur · radius 8 · lum 0.7. */
export function lutSummary(lut: LutSettings): string {
  const parts: string[] = [algorithmLabel(lut.algorithm)];

  if (lut.algorithm === "gaussian-blur") {
    parts.push(`radius ${lut.radius}`);
  } else if (lut.algorithm === "gaussian-rbf") {
    parts.push(`shape ${lut.shape}`);
  } else if (lut.algorithm === "shepards-method") {
    parts.push(`power ${lut.power}`);
  }

  parts.push(`lum ${lut.luminosity.toFixed(2)}`);

  return parts.join(" · ");
}

// Marketing names for common ratios, which rarely match the pixels exactly.
const RATIOS: [number, string][] = [
  [32 / 9, "32:9"],
  [21 / 9, "21:9"],
  [16 / 9, "16:9"],
  [16 / 10, "16:10"],
  [3 / 2, "3:2"],
  [4 / 3, "4:3"],
  [1, "1:1"],
];

/** 3440x1440 becomes 21:9, 1440x2560 becomes 9:16, 6320x2560 becomes 2.47:1. */
export function aspectLabel(size: Size): string {
  const wide = size.width >= size.height;
  const ratio = wide ? size.width / size.height : size.height / size.width;
  const known = RATIOS.find(
    ([value]) => Math.abs(value - ratio) / value < 0.04,
  );

  if (!known) {
    return wide ? `${ratio.toFixed(2)}:1` : `1:${ratio.toFixed(2)}`;
  }

  return wide ? known[1] : known[1].split(":").reverse().join(":");
}

/** ultrawide 21:9 becomes ultrawide-21-9, for {output}. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z\d]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface TemplateValues {
  name: string;
  /** null when the LUT is off. */
  palette: string | null;
  size: Size;
  output: string;
}

/** The output path for one file and size, below the output directory. */
export function renderTemplate(
  template: string,
  values: TemplateValues,
  format: OutputFormat,
): string {
  const path = template
    .replaceAll("{name}", values.name)
    .replaceAll("{palette}", values.palette ?? "original")
    .replaceAll("{w}", String(values.size.width))
    .replaceAll("{h}", String(values.size.height))
    .replaceAll("{output}", slugify(values.output));

  return `${path}.${format}`;
}

/** Why a template cannot be used, null when it can. */
export function templateProblem(template: string): string | null {
  if (!template.includes("{name}")) {
    return "The template needs {name}, or every file would be written to the same place";
  }

  if (
    !template.includes("{w}") &&
    !template.includes("{h}") &&
    !template.includes("{output}")
  ) {
    return "The template needs {w}, {h} or {output} to tell the outputs apart";
  }

  const segments = template.split("/");

  if (
    segments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    )
  ) {
    return "Folders in the template can't be empty, . or ..";
  }

  return null;
}
