/** Removes an account; its library stays in its folder. */
export default defineEventHandler(async (event) => {
  await deleteAccount(
    requireAdmin(event),
    getRouterParam(event, "username", { decode: true }) ?? "",
  );
});
