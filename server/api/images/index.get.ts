export default defineEventHandler(async (): Promise<LibraryImage[]> => {
  const { images } = await loadLibrary(useDirectories());

  return images;
});
