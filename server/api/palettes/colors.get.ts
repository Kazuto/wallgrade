import { z } from "zod";

const querySchema = z.object({
  // Comma separated; a picker only shows a few at a time.
  names: z
    .string()
    .transform((value) => value.split(",").filter(Boolean))
    .pipe(z.array(z.string()).max(60)),
});

export default defineEventHandler(
  async (event): Promise<Record<string, string[]>> => {
    const { names } = await getValidatedQuery(event, querySchema.parse);
    const known = new Set(await paletteNames());

    return Object.fromEntries(
      await Promise.all(
        names
          .filter((name) => known.has(name))
          .map(async (name) => [name, await paletteColors(name)] as const),
      ),
    );
  },
);
