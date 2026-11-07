import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createError } from "h3";
import { z } from "zod";
import type {
  FileOverrides,
  FocusPoint,
  Settings,
} from "../../shared/types/wallgrade";
import {
  DEFAULT_SETTINGS,
  focusSchema,
  lutSchema,
  hasOverrides,
  overridesSchema,
  settingsSchema,
} from "../../shared/utils/settings";

/** Kept next to the sources, so focus points travel with the images. */
export const STATE_FILE = ".wallgrade.json";

export interface ImageState {
  point?: FocusPoint;
  overrides?: FileOverrides;
  skip?: boolean;
  /** Fingerprint of what each output was made from, by output file. */
  outputs?: Record<string, string>;
}

export interface State {
  settings: Settings;
  /** By path below the source directory. */
  images: Record<string, ImageState>;
  /** Saved batch settings, by name. */
  presets: Record<string, Settings>;
}

const stateSchema = z.object({
  // Settings missing in the file, e.g. ones added later, take their defaults.
  settings: settingsSchema
    .extend({ lut: lutSchema.partial().default({}) })
    .partial()
    .default({}),
  images: z
    .record(
      z.string(),
      z.object({
        point: focusSchema.optional(),
        overrides: overridesSchema.optional(),
        skip: z.boolean().optional(),
        outputs: z.record(z.string(), z.string()).optional(),
      }),
    )
    .default({}),
  presets: z.record(z.string(), settingsSchema).default({}),
});

// Writes to the same file wait for each other, so no change gets lost.
const queues = new Map<string, Promise<unknown>>();

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

export async function readState(sourceDir: string): Promise<State> {
  const file = join(sourceDir, STATE_FILE);
  let text: string;

  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if (isNotFound(error)) {
      return {
        settings: structuredClone(DEFAULT_SETTINGS),
        images: {},
        presets: {},
      };
    }

    throw error;
  }

  // A broken file is reported instead of replaced, it holds hand-picked focus points.
  let result;

  try {
    result = stateSchema.safeParse(JSON.parse(text));
  } catch {
    result = null;
  }

  if (!result?.success) {
    throw createError({
      statusCode: 500,
      statusMessage: `${file} is not valid, fix or remove it`,
    });
  }

  const { lut, ...settings } = result.data.settings;

  return {
    settings: {
      ...DEFAULT_SETTINGS,
      ...settings,
      lut: { ...DEFAULT_SETTINGS.lut, ...lut },
    },
    images: result.data.images,
    presets: result.data.presets,
  };
}

/** Reads the state, lets change modify it and writes it back. */
export function updateState(
  sourceDir: string,
  change: (state: State) => void,
): Promise<State> {
  const file = join(sourceDir, STATE_FILE);
  const previous = queues.get(file) ?? Promise.resolve();

  const next = previous
    .catch(() => {})
    .then(async () => {
      const state = await readState(sourceDir);

      change(state);

      // Entries that hold nothing but defaults carry no information.
      state.images = Object.fromEntries(
        Object.entries(state.images).filter(
          ([, image]) =>
            image.point ||
            image.skip ||
            hasOverrides(image.overrides ?? {}) ||
            Object.keys(image.outputs ?? {}).length > 0,
        ),
      );

      // Written next to the file and renamed, so readers never see half of it.
      const part = `${file}.part`;

      await mkdir(sourceDir, { recursive: true });
      await writeFile(part, `${JSON.stringify(state, null, 2)}\n`);
      await rename(part, file);

      return state;
    });

  queues.set(file, next);

  return next;
}
