import type { H3Event } from "h3";
import type { Account } from "../../shared/types/wallgrade";
import { type Users, sessionVersion } from "./accounts";
import { createThrottle } from "./throttle";

// Ten wrong passwords for one name within 15 minutes, then it has to wait.
export const passwordThrottle = createThrottle(10, 15 * 60 * 1000);

/** Whoever the session belongs to, null when there is none or it ended meanwhile. */
export async function currentAccount(
  event: H3Event,
  users: Users,
): Promise<Account | null> {
  const { user, version } = await getUserSession(event);

  if (!user || version !== (await sessionVersion(users, user.username))) {
    return null;
  }

  return {
    username: user.username,
    admin: user.username === users.admin.username,
  };
}

/** The sign-in settings, a 403 for anyone but the admin. */
export function requireAdmin(event: H3Event): Users {
  const users = requireUsers();

  if (!event.context.account?.admin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only the admin can do that",
    });
  }

  return users;
}

/** A 429 when key failed too often lately, see passwordThrottle. */
export function checkThrottle(event: H3Event, key: string) {
  const wait = passwordThrottle.wait(key);

  if (wait > 0) {
    setResponseHeader(event, "Retry-After", Math.ceil(wait / 1000));

    throw createError({
      statusCode: 429,
      statusMessage: `Too many attempts, try again in ${Math.ceil(wait / 60_000)} minutes`,
    });
  }
}
