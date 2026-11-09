/** Who is signed in, when wallgrade has users. Loaded by plugins/account.ts. */
export function useAccount() {
  const session = useState<SessionInfo | null>("session", () => null);

  async function load() {
    session.value = await $fetch<SessionInfo>("/api/session");
  }

  const account = computed(() => session.value?.account ?? null);

  /** Whether the sign-in has to come before anything else. */
  const needsSignIn = computed(
    () => session.value?.users === true && !session.value.account,
  );

  // Both start the app over, so nothing of one library stays around for the next.
  async function signIn(username: string, password: string) {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: { username, password },
    });
    reloadNuxtApp({ path: "/", force: true });
  }

  async function signOut() {
    await $fetch("/api/auth/logout", { method: "POST" });
    reloadNuxtApp({ path: "/login", force: true });
  }

  return { session, account, needsSignIn, load, signIn, signOut };
}
