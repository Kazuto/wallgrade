import type { H3Event } from "h3";
import type { Users } from "./accounts";
import { type Directories, expandPath, libraryDirectories } from "./paths";

/** The sign-in settings, null when wallgrade runs without users. See runtimeConfig in nuxt.config.ts. */
export function useUsers(): Users | null {
  const config = useRuntimeConfig();

  if (!config.usersDir) {
    return null;
  }

  return {
    dir: expandPath(config.usersDir),
    admin: {
      username: config.adminUsername.trim().toLowerCase(),
      password: config.adminPassword,
    },
  };
}

/** The sign-in settings, a 404 when wallgrade runs without users. */
export function requireUsers(): Users {
  const users = useUsers();

  if (!users) {
    throw createError({
      statusCode: 404,
      statusMessage: "wallgrade runs without users",
    });
  }

  return users;
}

/** The library of whoever made the request, see runtimeConfig in nuxt.config.ts. */
export function useDirectories(event: H3Event): Directories {
  return libraryDirectories(
    useRuntimeConfig(event),
    event.context.account?.username ?? null,
  );
}
