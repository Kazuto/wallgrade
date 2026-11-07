import { z } from "zod";

const bodySchema = z.object({
  path: z.string().min(1),
  // Also redo outputs that are done.
  force: z.boolean().default(false),
});

export default defineEventHandler(async (event): Promise<LibraryImage> => {
  const { path, force } = await readValidatedBody(event, bodySchema.parse);

  try {
    return await convertSource(useDirectories(), path, force);
  } catch (error) {
    if (isError(error)) {
      throw error;
    }

    // lutgen and sharp failures, e.g. a source that turned out to be broken.
    console.error(error);

    throw createError({
      statusCode: 500,
      statusMessage: `Converting ${path} failed: ${(error as Error).message.split("\n")[0]}`,
    });
  }
});
