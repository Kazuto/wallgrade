import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { Zip, ZipPassThrough } from "fflate";

/** Every rendered output of the files that are not skipped, in one archive. */
export default defineEventHandler(async (event) => {
  const dirs = useDirectories(event);
  const { images } = await loadLibrary(dirs);
  const files = images
    .filter((image) => !image.skip)
    .flatMap((image) => image.outputs)
    .filter((output) => output.status !== "missing")
    .map((output) => output.file);

  if (files.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Nothing rendered yet",
    });
  }

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const zip = new Zip((error, chunk, final) => {
        if (error) {
          controller.error(error);

          return;
        }

        controller.enqueue(chunk);

        if (final) {
          controller.close();
        }
      });

      // Images are compressed already, so they are stored as they are.
      for (const file of files) {
        const entry = new ZipPassThrough(file);

        zip.add(entry);

        for await (const chunk of Readable.toWeb(
          createReadStream(resolveInside(dirs.output, file)),
        ) as AsyncIterable<Uint8Array>) {
          entry.push(chunk);
        }

        entry.push(new Uint8Array(), true);
      }

      zip.end();
    },
  });

  setResponseHeaders(event, {
    "Content-Type": "application/zip",
    "Content-Disposition": 'attachment; filename="wallgrade.zip"',
  });

  return sendStream(event, body);
});
