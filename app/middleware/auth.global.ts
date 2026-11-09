/** Keeps everyone on the sign-in until they signed in, and the user list to the admin. */
export default defineNuxtRouteMiddleware((to) => {
  const { account, needsSignIn } = useAccount();

  if (needsSignIn.value) {
    return to.path === "/login" ? undefined : navigateTo("/login");
  }

  if (
    to.path === "/login" ||
    (to.path === "/account" && !account.value) ||
    (to.path === "/users" && !account.value?.admin)
  ) {
    return navigateTo("/");
  }
});
