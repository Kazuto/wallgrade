import { chmod, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  expandPath,
  isInside,
  libraryDirectories,
  resolveInside,
  toApiPath,
  unwritableDirectories,
} from "../../server/utils/paths";
import { tempDirectories } from "./helpers";

const ROOT = "/srv/wallpapers";

describe("libraryDirectories", () => {
  const config = {
    sourceDir: ROOT,
    outputDir: "",
    cacheDir: "/var/cache/wallgrade",
    usersDir: "",
  };
  const users = { ...config, outputDir: "/srv/out", usersDir: "/srv/users" };

  it("uses the configured directories without users", () => {
    expect(libraryDirectories(config, null)).toEqual({
      source: ROOT,
      output: `${ROOT}/output`,
      cache: "/var/cache/wallgrade",
    });
    expect(
      libraryDirectories({ ...config, outputDir: "/srv/out" }, null).output,
    ).toBe("/srv/out");
  });

  it("gives each user a folder of their own and shares the cache", () => {
    expect(libraryDirectories(users, "alex")).toEqual({
      source: "/srv/users/alex",
      output: "/srv/users/alex/output",
      cache: "/var/cache/wallgrade",
    });
  });

  it.each([null, "", "..", "../bea", "Alex", "a/b", ".accounts.json"])(
    "refuses %j with users",
    (username) => {
      expect(() => libraryDirectories(users, username)).toThrow(
        expect.objectContaining({ statusCode: 401 }),
      );
    },
  );
});

describe("isInside", () => {
  it.each([
    ["/srv/wallpapers/a.png", true],
    ["/srv/wallpapers/bleach/a.png", true],
    ["/srv/wallpapers", false],
    ["/srv/wallpapers-old/a.png", false],
    ["/srv/a.png", false],
    ["/srv/wallpapers/../a.png", false],
  ])("%s is %s", (path, inside) => {
    expect(isInside(ROOT, path)).toBe(inside);
  });
});

describe("resolveInside", () => {
  it("resolves a path below the root", () => {
    expect(resolveInside(ROOT, "bleach/a.png")).toBe(
      "/srv/wallpapers/bleach/a.png",
    );
  });

  it.each(["../a.png", "bleach/../../a.png", "/etc/passwd", "", "."])(
    "refuses %j",
    (path) => {
      expect(() => resolveInside(ROOT, path)).toThrow(
        expect.objectContaining({ statusCode: 400 }),
      );
    },
  );
});

describe("expandPath", () => {
  it("expands a leading ~", () => {
    expect(expandPath("~/wallpaper_bak")).toBe(
      join(homedir(), "wallpaper_bak"),
    );
    expect(expandPath("~")).toBe(homedir());
  });

  it("leaves ~ elsewhere alone", () => {
    expect(expandPath("/a/~b")).toBe("/a/~b");
  });
});

describe("toApiPath", () => {
  it("joins with forward slashes", () => {
    expect(toApiPath(ROOT, "/srv/wallpapers/bleach/a.png")).toBe(
      "bleach/a.png",
    );
  });
});

// root may write anywhere.
describe.skipIf(process.getuid?.() === 0)("unwritableDirectories", () => {
  it("accepts writable and missing directories", async () => {
    const dirs = await tempDirectories();

    await mkdir(dirs.source);

    expect(await unwritableDirectories(dirs)).toEqual([]);
  });

  it("reports a read-only directory once, where missing ones would go", async () => {
    const dirs = await tempDirectories();

    await mkdir(dirs.source);
    await chmod(dirs.source, 0o555);

    try {
      expect(await unwritableDirectories(dirs)).toEqual([dirs.source]);
    } finally {
      await chmod(dirs.source, 0o755);
    }
  });

  it("checks the parent of a missing directory", async () => {
    const dirs = await tempDirectories();
    const root = dirname(dirs.source);

    await chmod(root, 0o555);

    try {
      expect(await unwritableDirectories(dirs)).toEqual([root]);
    } finally {
      await chmod(root, 0o755);
    }
  });
});
