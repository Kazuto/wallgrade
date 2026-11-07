import { describe, expect, it } from "vitest";
import {
  boundingBox,
  coverCrop,
  cropCenter,
  parseMonitor,
  parseSize,
} from "../../shared/utils/geometry";

const UHD = { width: 3840, height: 2160 };
const MONITORS = ["1440x2560+0+0", "3440x1440+1440+640", "1440x2560+4880+0"];

describe("parseSize", () => {
  it.each([
    ["3440x1440", { width: 3440, height: 1440 }],
    [" 1440x2560 ", { width: 1440, height: 2560 }],
  ])("reads %j", (value, expected) => {
    expect(parseSize(value)).toEqual(expected);
  });

  it.each(["3440×1440", "0x1440", "3440x", "3440x1440+0+0", ""])(
    "refuses %j",
    (value) => {
      expect(parseSize(value)).toBeNull();
    },
  );
});

describe("parseMonitor", () => {
  it("reads size and position", () => {
    expect(parseMonitor("1440x2560+4880+0")).toEqual({
      width: 1440,
      height: 2560,
      x: 4880,
      y: 0,
    });
  });

  it.each(["1440x2560", "1440x2560+-1+0", "1440x2560+0"])(
    "refuses %j",
    (value) => {
      expect(parseMonitor(value)).toBeNull();
    },
  );
});

describe("boundingBox", () => {
  it("spans every monitor from the origin", () => {
    expect(
      boundingBox(MONITORS.map((monitor) => parseMonitor(monitor)!)),
    ).toEqual({ width: 6320, height: 2560 });
  });

  it("is empty without rects", () => {
    expect(boundingBox([])).toEqual({ width: 0, height: 0 });
  });
});

describe("coverCrop", () => {
  it("keeps the full width for a wider target", () => {
    const crop = coverCrop(
      UHD,
      { width: 3440, height: 1440 },
      {
        x: 0.5,
        y: 0.5,
      },
    );

    expect(crop.width).toBe(3840);
    expect(crop.height).toBe(1607);
    expect(crop.x).toBe(0);
    // Centered: as much above as below.
    expect(
      Math.abs(crop.y - (2160 - crop.y - crop.height)),
    ).toBeLessThanOrEqual(1);
  });

  it("keeps the full height for a taller target", () => {
    const crop = coverCrop(
      UHD,
      { width: 1440, height: 2560 },
      {
        x: 0.45,
        y: 0.5,
      },
    );

    expect(crop).toEqual({ x: 1121, y: 0, width: 1215, height: 2160 });
  });

  it("matches the commands shown for a span across three monitors", () => {
    // The crop of bleach-sui-feng-black-cat.jpg that cut off heads before.
    expect(
      coverCrop(UHD, { width: 6320, height: 2560 }, { x: 0.3, y: 0.6 }),
    ).toEqual({ x: 0, y: 519, width: 3840, height: 1555 });
  });

  it.each([
    [{ x: 0, y: 0 }, 0],
    [{ x: 1, y: 1 }, 2160 - 1607],
  ])("stops at the edges for %j", (focus, y) => {
    expect(coverCrop(UHD, { width: 3440, height: 1440 }, focus).y).toBe(y);
  });

  it("uses the whole source for the same ratio", () => {
    expect(
      coverCrop(UHD, { width: 1920, height: 1080 }, { x: 0.1, y: 0.9 }),
    ).toEqual({ x: 0, y: 0, ...UHD });
  });
});

describe("cropCenter", () => {
  it("gives back the focus point of an unclamped crop", () => {
    const focus = { x: 0.62, y: 0.4 };
    const center = cropCenter(
      UHD,
      coverCrop(UHD, { width: 1440, height: 2560 }, focus),
    );

    expect(center.x).toBeCloseTo(focus.x, 3);
    expect(center.y).toBe(0.5);
  });
});
