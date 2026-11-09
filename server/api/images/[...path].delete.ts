/** Deletes a source and everything rendered from it. */
export default defineEventHandler(async (event) => {
  await deleteSource(
    useDirectories(event),
    getRouterParam(event, "path", { decode: true }) ?? "",
  );
});
