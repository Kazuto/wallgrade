// Reachable without signing in.
const PUBLIC = new Set(["/api/session", "/api/auth/login", "/api/auth/logout"]);

// Everything that reads or changes a library; the rest is the app itself.
const PROTECTED = [
  "/api/",
  "/preview/",
  "/output/",
  "/original/",
  "/outputs.zip",
];

function sameOrigin(origin: string, host: string): boolean {
  try {
    return new URL(origin).host === host;
  } catch {
    // "null", e.g. from a sandboxed frame.
    return false;
  }
}

export default defineEventHandler(async (event) => {
  // Forms and scripts on other sites could otherwise upload or render here,
  // signed in or not: browsers send simple POSTs without asking first.
  const origin = getRequestHeader(event, "origin");

  if (
    !["GET", "HEAD"].includes(event.method) &&
    origin &&
    !sameOrigin(origin, getRequestHost(event))
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: "Requests from other sites are refused",
    });
  }

  const users = useUsers();
  const path = getRequestURL(event).pathname;

  if (
    !users ||
    PUBLIC.has(path) ||
    !PROTECTED.some((prefix) => path.startsWith(prefix))
  ) {
    return;
  }

  const account = await currentAccount(event, users);

  if (!account) {
    throw createError({ statusCode: 401, statusMessage: "Sign in first" });
  }

  event.context.account = account;
});
