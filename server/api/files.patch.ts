import { z } from "zod";

// Fields left out stay as they are; null clears them.
const bodySchema = z.object({
  paths: z.array(z.string().min(1)).min(1),
  point: focusSchema.nullable().optional(),
  overrides: overridesSchema.nullable().optional(),
  skip: z.boolean().optional(),
});

/** Changes the focus point, overrides or skipping of one or more files. */
export default defineEventHandler(async (event): Promise<LibraryImage[]> => {
  const dirs = useDirectories(event);
  const { paths, point, overrides, skip } = await readValidatedBody(
    event,
    bodySchema.parse,
  );
  const known = new Set((await scanSources(dirs)).map((source) => source.path));
  const unknown = paths.find((path) => !known.has(path));

  // Only real images end up in the state.
  if (unknown) {
    throw createError({
      statusCode: 404,
      statusMessage: `${unknown} not found`,
    });
  }

  await updateState(dirs.source, (state) => {
    for (const path of paths) {
      const entry = (state.images[path] ??= {});

      if (point !== undefined) {
        entry.point = point ?? undefined;
      }

      if (overrides !== undefined) {
        entry.overrides = overrides ?? undefined;
      }

      if (skip !== undefined) {
        entry.skip = skip || undefined;
      }
    }
  });

  const { images } = await loadLibrary(dirs);

  return images.filter((image) => paths.includes(image.path));
});
