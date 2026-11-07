import { z } from "zod";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(60),
});

/** Saves the current batch settings under a name, replacing one of the same name. */
export default defineEventHandler(
  async (event): Promise<Record<string, Settings>> => {
    const { name } = await readValidatedBody(event, bodySchema.parse);
    const state = await updateState(useDirectories().source, (current) => {
      current.presets[name] = structuredClone(current.settings);
    });

    return state.presets;
  },
);
