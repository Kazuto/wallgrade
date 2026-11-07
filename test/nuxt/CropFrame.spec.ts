import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import CropFrame from "~/components/CropFrame.vue";

const UHD = { width: 3840, height: 2160 };

function mountFrame(props: Partial<InstanceType<typeof CropFrame>["$props"]>) {
  return mountSuspended(CropFrame, {
    props: {
      image: UHD,
      before: "/before.webp",
      after: "/after.webp",
      mode: "after",
      target: { width: 1440, height: 2560 },
      focus: { x: 0.5, y: 0.5 },
      manual: true,
      ...props,
    },
  });
}

describe("CropFrame", () => {
  it("outlines the crop of the target", async () => {
    const wrapper = await mountFrame({ focus: { x: 0, y: 0.5 } });
    const style = wrapper.find(".border-accent").attributes("style");

    // 1215 of 3840 pixels wide, from the left edge.
    expect(style).toContain("left: 0%");
    expect(style).toContain("width: 31.640625%");
    expect(style).toContain("height: 100%");
  });

  it("shows the whole image without a target", async () => {
    const wrapper = await mountFrame({ target: null });

    expect(wrapper.find(".border-accent").exists()).toBe(false);
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it.each([
    ["ArrowRight", false, { x: 0.51, y: 0.5 }],
    ["ArrowUp", false, { x: 0.5, y: 0.49 }],
    ["ArrowLeft", true, { x: 0.45, y: 0.5 }],
    ["ArrowDown", true, { x: 0.5, y: 0.55 }],
  ])("moves the point with %s (shift: %s)", async (key, shiftKey, point) => {
    const wrapper = await mountFrame({});

    await wrapper.find("button").trigger("keydown", { key, shiftKey });

    const [[committed]] = wrapper.emitted("commit") as [[FocusPoint]];

    expect(committed.x).toBeCloseTo(point.x);
    expect(committed.y).toBeCloseTo(point.y);
  });

  it("keeps the point inside the image", async () => {
    const wrapper = await mountFrame({ focus: { x: 1, y: 0 } });

    await wrapper.find("button").trigger("keydown", { key: "ArrowRight" });
    await wrapper.find("button").trigger("keydown", { key: "ArrowUp" });

    expect(wrapper.emitted("commit")).toEqual([
      [{ x: 1, y: 0 }],
      [{ x: 1, y: 0 }],
    ]);
  });

  it("leaves other keys to the page", async () => {
    const wrapper = await mountFrame({});

    await wrapper.find("button").trigger("keydown", { key: "Escape" });

    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("splits before and after", async () => {
    const wrapper = await mountFrame({ mode: "split", split: 0.25 });
    const [before, after] = wrapper.findAll("img");

    expect(before!.attributes("src")).toBe("/before.webp");
    expect(after!.attributes("style")).toContain("inset(0 0 0 25%)");
  });
});
