import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import PaletteCard from "~/components/PaletteCard.vue";

const colors = (count: number) =>
  Array.from(
    { length: count },
    (_, index) => `#${index.toString(16).padStart(2, "0").repeat(3)}`,
  );

async function swatches(count: number) {
  const wrapper = await mountSuspended(PaletteCard, {
    props: { name: "catppuccin-mocha", colors: colors(count), selected: false },
  });

  return wrapper
    .findAll("span.flex-1")
    .map((swatch) => swatch.attributes("style"));
}

describe("PaletteCard", () => {
  it("names the palette", async () => {
    const wrapper = await mountSuspended(PaletteCard, {
      props: { name: "catppuccin-mocha", selected: true },
    });

    expect(wrapper.text()).toBe("Catppuccin Mocha");
    expect(wrapper.attributes("aria-pressed")).toBe("true");
  });

  it("shows small palettes whole", async () => {
    expect(await swatches(5)).toHaveLength(5);
  });

  it("samples large palettes from end to end", async () => {
    const shown = await swatches(26);

    expect(shown).toHaveLength(10);
    expect(shown[0]).toContain("#000000");
    // The last of 26 colors, #191919.
    expect(shown[9]).toContain("#191919");
  });

  it("emits select", async () => {
    const wrapper = await mountSuspended(PaletteCard, {
      props: { name: "nord", selected: false },
    });

    await wrapper.trigger("click");

    expect(wrapper.emitted("select")).toHaveLength(1);
  });
});
