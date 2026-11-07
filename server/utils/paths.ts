import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { createError } from "h3";

export interface Directories {
  source: string;
  output: string;
  cache: string;
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
