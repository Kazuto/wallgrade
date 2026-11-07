export default defineEventHandler(async (event): Promise<LibraryImage[]> => {
  const { images } = await loadLibrary(useDirectories(event));

  return images;
});
