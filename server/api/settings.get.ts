export default defineEventHandler(async (event): Promise<Settings> => {
  const { settings } = await readState(useDirectories(event).source);

  return settings;
});
