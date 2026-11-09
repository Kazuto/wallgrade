import { writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";

/** A file name without folders, control characters or a leading dot. */
function cleanName(filename: string) {
  const base = filename.split(/[/\\]/).pop() ?? "";
  const clean = [...base]
    .filter((char) => char.charCodeAt(0) >= 32)
    .join("")
    .trim()
    .replace(/^\.+/, "");
  const extension = extname(clean).toLowerCase();

  return {
    name: clean.slice(0, clean.length - extension.length) || "image",
    extension,
  };
}

export default defineEventHandler(
  async (event): Promise<{ paths: string[]; rejected: string[] }> => {
    const dirs = useDirectories(event);
    const parts = (await readMultipartFormData(event)) ?? [];
    const files = parts.filter(
      (part) => part.name === "files" && part.filename,
    );

    if (files.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "No files uploaded",
      });
    }

    // Outputs are named after the source alone, so a new name may exist in no folder.
    const taken = new Set(
      (await scanSources(dirs)).map((source) => source.name),
    );
    const paths: string[] = [];
    const rejected: string[] = [];

    for (const part of files) {
      const { name, extension } = cleanName(part.filename!);
      const readable =
        isImageFile(`x${extension}`) &&
        (await sharp(part.data)
          .metadata()
          .then(() => true)
          .catch(() => false));

      if (!readable) {
        rejected.push(part.filename!);

        continue;
      }

      let unique = name;

      for (let n = 2; taken.has(unique); n++) {
        unique = `${name}-${n}`;
      }

      taken.add(unique);

      const file = join(dirs.source, `${unique}${extension}`);

      // wx fails instead of overwriting, should the name have been taken meanwhile.
      await writeFile(file, part.data, { flag: "wx" });
      paths.push(toApiPath(dirs.source, file));
    }

    return { paths, rejected };
  },
);
