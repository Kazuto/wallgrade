import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

export default defineEventHandler(async (event) => {
  const dirs = useDirectories();
  const file = resolveInside(
    dirs.output,
    getRouterParam(event, "path", { decode: true }) ?? "",
  );
  const info = await stat(file).catch(() => null);

  if (
    !file.endsWith(".avif") ||
    file.endsWith(".part.avif") ||
    !info?.isFile()
  ) {
    throw createError({ statusCode: 404, statusMessage: "Output not found" });
  }

  // The URL carries the file's version, so a cached copy is never outdated.
  setResponseHeaders(event, {
    "Content-Type": "image/avif",
    "Content-Length": info.size,
    "Cache-Control": "private, max-age=31536000, immutable",
  });

  return sendStream(event, createReadStream(file));
});
