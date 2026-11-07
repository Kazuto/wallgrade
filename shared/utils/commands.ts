import type { LutSettings, OutputFormat, Rect, Size } from "../types/wallgrade";

/**
 * The options lutgen generate gets for these settings, without the output. Only
 * those of the chosen algorithm take part, so they also identify the LUT.
 */
export function lutArgs(lut: LutSettings): string[] {
  const args = [`--palette=${lut.palette}`];

  switch (lut.algorithm) {
    case "gaussian-blur":
      // The default algorithm has no flag of its own.
      args.push(`--radius=${lut.radius}`);

      break;
    case "gaussian-rbf":
      args.push(
        "--gaussian-rbf",
        `--shape=${lut.shape}`,
        `--nearest=${lut.nearest}`,
      );

      break;
    case "shepards-method":
      args.push(
        "--shepards-method",
        `--power=${lut.power}`,
        `--nearest=${lut.nearest}`,
      );

      break;
    case "nearest-neighbor":
      args.push("--nearest-neighbor");

      break;
  }

  args.push(`--level=${lut.level}`, `--lum=${lut.luminosity}`);

  if (lut.preserve) {
    args.push("--preserve");
  }

  return args;
}

/** Quotes an argument for a POSIX shell where it needs it. */
export function shellQuote(arg: string): string {
  return /^[\w@%+=:,./-]+$/.test(arg)
    ? arg
    : `'${arg.replaceAll("'", `'\\''`)}'`;
}

/** The file name vips saves to, with the quality for lossy formats. */
export function saveTarget(
  file: string,
  format: OutputFormat,
  quality: number,
): string {
  return format === "png" ? file : `${file}[Q=${quality}]`;
}

export interface CommandsInput {
  /** Source file name as the commands refer to it. */
  source: string;
  /** Output file name. */
  output: string;
  crop: Rect;
  size: Size;
  lut: LutSettings;
  format: OutputFormat;
  quality: number;
}

/** Shell commands that make the same output with the lutgen and vips CLIs. */
export function pipelineCommands(input: CommandsInput): string[][] {
  const { crop, size, lut } = input;
  const commands: string[][] = [];
  let image = "sized.png";

  if (lut.enabled) {
    commands.push(["lutgen", "generate", ...lutArgs(lut), "--output=lut.png"]);
  }

  commands.push(
    [
      "vips",
      "extract_area",
      input.source,
      "crop.png",
      ...[crop.x, crop.y, crop.width, crop.height].map(String),
    ],
    [
      "vips",
      "thumbnail",
      "crop.png",
      image,
      String(size.width),
      "--height",
      String(size.height),
      "--size",
      "force",
    ],
  );

  if (lut.enabled) {
    commands.push([
      "lutgen",
      "apply",
      "--hald-clut=lut.png",
      image,
      "--output=graded.png",
    ]);
    image = "graded.png";
  }

  // lutgen adds an alpha channel, which flatten removes.
  commands.push([
    "vips",
    lut.enabled ? "flatten" : "copy",
    image,
    saveTarget(input.output, input.format, input.quality),
  ]);

  return commands;
}
