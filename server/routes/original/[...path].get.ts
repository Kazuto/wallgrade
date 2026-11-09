import { createReadStream } from "node:fs";
import { basename, extname } from "node:path";

/** A source as it is on disk, to download. */
export default defineEventHandler(async (event) => {
  const dirs = useDirectories(event);
  const file = resolveInside(
    dirs.source,
    getRouterParam(event, "path", { decode: true }) ?? "",
  );
  const source = isSourcePath(dirs, file) ? await readSource(dirs, file) : null;

  if (!source) {
    throw createError({ statusCode: 404, statusMessage: "Image not found" });
  }

  // The URL carries the source's version, so a cached copy is never outdated.
  setResponseHeaders(event, {
    "Content-Type":
      MEDIA_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
    "Content-Length": source.bytes,
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(basename(file))}`,
    "Cache-Control": "private, max-age=31536000, immutable",
  });

  return sendStream(event, createReadStream(file));
});
