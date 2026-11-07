export default defineEventHandler(async (): Promise<Settings> => {
  const { settings } = await readState(useDirectories().source);

  return settings;
});
