import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { createError } from "h3";
import { usernameSchema } from "../../shared/utils/accounts";

export interface Directories {
  source: string;
  output: string;
  cache: string;
}

/** The directory settings in nuxt.config.ts' runtimeConfig. */
export interface DirectoryConfig {
  sourceDir: string;
  outputDir: string;
  cacheDir: string;
  usersDir: string;
}

/**
 * One library's directories: the user's folder below usersDir when that is set,
 * otherwise the configured ones. The cache is shared, its keys are absolute paths.
 */
export function libraryDirectories(
  config: DirectoryConfig,
  username: string | null,
): Directories {
  const cache = expandPath(config.cacheDir);

  if (config.usersDir) {
    // Checked at sign-in already; this keeps any other name from leaving usersDir.
    if (!username || usernameSchema.safeParse(username).data !== username) {
      throw createError({ statusCode: 401, statusMessage: "Sign in first" });
    }

    const source = join(expandPath(config.usersDir), username);

    return { source, output: join(source, "output"), cache };
  }

  const source = expandPath(config.sourceDir);

  return {
    source,
    output: config.outputDir
      ? expandPath(config.outputDir)
      : join(source, "output"),
    cache,
  };
}

/** Resolves a path to an absolute one, expanding a leading ~ like a shell does. */
export function expandPath(path: string): string {
  if (path === "~" || path.startsWith("~/")) {
    return join(homedir(), path.slice(1));
  }

  return resolve(path);
}

/** Whether path lies below root (root itself does not count). */
export function isInside(root: string, path: string): boolean {
  const rel = relative(root, path);

  return (
    rel !== "" &&
    rel !== ".." &&
    !rel.startsWith(`..${sep}`) &&
    !isAbsolute(rel)
  );
}

/** Resolves a relative path below root, refusing any that would leave it. */
export function resolveInside(root: string, path: string): string {
  const full = resolve(root, path);

  if (!isInside(root, full)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }

  return full;
}

/** A path below root with forward slashes, as the API passes them around. */
export function toApiPath(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}

/**
 * The directories wallgrade can't write to. A missing one is created on first use,
 * so its nearest existing parent is checked instead.
 */
export async function unwritableDirectories(
  dirs: Directories,
): Promise<string[]> {
  const unwritable = new Set<string>();

  for (const dir of [dirs.source, dirs.output, dirs.cache]) {
    let existing = dir;

    while (!(await exists(existing)) && dirname(existing) !== existing) {
      existing = dirname(existing);
    }

    const writable = await access(
      existing,
      constants.W_OK | constants.X_OK,
    ).then(
      () => true,
      () => false,
    );

    if (!writable) {
      unwritable.add(existing);
    }
  }

  return [...unwritable];
}
