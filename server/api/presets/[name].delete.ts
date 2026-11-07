export default defineEventHandler(
  async (event): Promise<Record<string, Settings>> => {
    const name = getRouterParam(event, "name", { decode: true }) ?? "";
    const state = await updateState(useDirectories().source, (current) => {
      current.presets = Object.fromEntries(
        Object.entries(current.presets).filter(([key]) => key !== name),
      );
    });

    return state.presets;
  },
);
