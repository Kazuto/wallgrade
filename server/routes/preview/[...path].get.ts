import { createReadStream } from "node:fs";
import { z } from "zod";

const querySchema = z.object({
  w: z.coerce
    .number()
    .refine(isPreviewWidth, { error: "Unsupported preview width" }),
  // LUT settings as JSON, for a recolored preview.
  lut: z
    .string()
    .transform((value) => JSON.parse(value))
    .pipe(lutSchema)
    .optional(),
});

export default defineEventHandler(async (event) => {
  const dirs = useDirectories(event);
  const query = await getValidatedQuery(event, querySchema.parse);
  const width = query.w as PreviewWidth;
  const file = resolveInside(
    dirs.source,
    getRouterParam(event, "path", { decode: true }) ?? "",
  );
  const source = isSourcePath(dirs, file) ? await readSource(dirs, file) : null;

  if (!source) {
    throw createError({ statusCode: 404, statusMessage: "Image not found" });
  }

  if (query.lut && !(await paletteNames()).includes(query.lut.palette)) {
    throw createError({
      statusCode: 422,
      statusMessage: `lutgen has no palette called ${query.lut.palette}`,
    });
  }

  const preview = query.lut?.enabled
    ? await renderGradedPreview(dirs, source, width, query.lut)
    : await renderPreview(dirs, source, width);

  // The URL carries the source's version and the LUT, so a cached copy is never outdated.
  setResponseHeaders(event, {
    "Content-Type": "image/webp",
    "Cache-Control": "private, max-age=31536000, immutable",
  });

  return sendStream(event, createReadStream(preview));
});
