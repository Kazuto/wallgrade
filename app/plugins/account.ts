/** Loads the session before the first page, which middleware/auth.global.ts needs. */
export default defineNuxtPlugin(async () => {
  const { session, load } = useAccount();
  const { notify } = useNotifications();

  try {
    await load();
  } catch (error) {
    notify(errorMessage(error), "error");
  }

  // A session can end meanwhile, e.g. when the admin removes the account.
  globalThis.$fetch = globalThis.$fetch.create({
    onResponseError({ request, response }) {
      if (
        response.status === 401 &&
        session.value?.users &&
        !String(request).startsWith("/api/auth/")
      ) {
        reloadNuxtApp({ path: "/login", force: true });
      }
    },
  });
});
