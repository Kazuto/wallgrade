import { describe, expect, it } from "vitest";

function image(
  statuses: OutputStatus[],
  change: Partial<LibraryImage> = {},
): LibraryImage {
  return {
    path: "wall.png",
    name: "wall",
    folder: "",
    width: 3840,
    height: 2160,
    format: "png",
    space: "srgb",
    depth: 8,
    version: 1,
    point: null,
    overrides: {},
    skip: false,
    outputs: statuses.map((status, index) => ({
      name: `Output ${index}`,
      size: `${100 + index}x100`,
      status,
      file: `${index}/wall.avif`,
      version: 0,
    })),
    conflict: null,
    ...change,
  };
}

describe("imageState", () => {
  it.each<[string, LibraryImage, boolean, ImageState]>([
    ["skipped", image(["missing"], { skip: true }), true, "skipped"],
    [
      "in conflict",
      image(["missing"], { conflict: "b.png" }),
      false,
      "conflict",
    ],
    ["being rendered", image(["missing"]), true, "rendering"],
    ["done", image(["done", "done"]), false, "done"],
    ["partly outdated", image(["done", "stale"]), false, "stale"],
    ["partly missing", image(["done", "missing"]), false, "ready"],
  ])("calls a file %s", (_, file, rendering, expected) => {
    expect(imageState(file, rendering)).toBe(expected);
  });
});

describe("pendingOutputs", () => {
  it.each<[string, LibraryImage, number]>([
    [
      "counts outputs that are not done",
      image(["done", "stale", "missing"]),
      2,
    ],
    ["counts nothing for skipped files", image(["missing"], { skip: true }), 0],
    [
      "counts nothing for files in conflict",
      image(["missing"], { conflict: "b.png" }),
      0,
    ],
  ])("%s", (_, file, expected) => {
    expect(pendingOutputs(file)).toBe(expected);
  });
});
