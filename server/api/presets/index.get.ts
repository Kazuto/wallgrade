export default defineEventHandler(
  async (): Promise<Record<string, Settings>> => {
    const { presets } = await readState(useDirectories().source);

    return presets;
  },
);
