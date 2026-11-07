import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  expandPath,
  isInside,
  resolveInside,
  toApiPath,
} from "../../server/utils/paths";

const ROOT = "/srv/wallpapers";

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
