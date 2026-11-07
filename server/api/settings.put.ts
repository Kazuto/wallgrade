export default defineEventHandler(async (event): Promise<Settings> => {
  const settings = await readValidatedBody(event, settingsSchema.parse);

  // Checked here because lutgen would only fail on the first render.
  if (!(await paletteNames()).includes(settings.lut.palette)) {
    throw createError({
      statusCode: 422,
      statusMessage: `lutgen has no palette called ${settings.lut.palette}`,
    });
  }

  const state = await updateState(useDirectories().source, (current) => {
    current.settings = {
      ...settings,
      monitors: [
        ...new Set(settings.monitors.map((monitor) => monitor.trim())),
      ],
    };
  });

  return state.settings;
});
