import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";

export default defineEventHandler(async (event) => {
  const dirs = useDirectories(event);
  const file = resolveInside(
    dirs.output,
    getRouterParam(event, "path", { decode: true }) ?? "",
  );
  const type = MEDIA_TYPES[extname(file).toLowerCase()];
  const info = await stat(file).catch(() => null);

  // .part files are still being written.
  if (!type || /\.part\.\w+$/.test(file) || !info?.isFile()) {
    throw createError({ statusCode: 404, statusMessage: "Output not found" });
  }

  // The URL carries the file's version, so a cached copy is never outdated.
  setResponseHeaders(event, {
    "Content-Type": type,
    "Content-Length": info.size,
    "Cache-Control": "private, max-age=31536000, immutable",
  });

  return sendStream(event, createReadStream(file));
});
