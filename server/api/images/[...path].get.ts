export default defineEventHandler(async (event): Promise<ImageDetail> => {
  const dirs = useDirectories();
  const path = getRouterParam(event, "path", { decode: true }) ?? "";
  const { source, image } = await findImage(dirs, path);

  // Needed for the overlays whatever the focus mode, switching it is instant then.
  const auto = await Promise.all(
    image.outputs.map(
      async (output) =>
        [
          output.size,
          await autoFocus(dirs, source, parseSize(output.size)!),
        ] as const,
    ),
  );

  return { ...image, auto: Object.fromEntries(auto) };
});
