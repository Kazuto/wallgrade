export default defineEventHandler(
  async (event): Promise<Record<string, Settings>> => {
    const { presets } = await readState(useDirectories(event).source);

    return presets;
  },
);
