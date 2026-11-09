export default defineEventHandler(async () => {
  try {
    return await paletteNames();
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: "lutgen is not installed",
    });
  }
});
