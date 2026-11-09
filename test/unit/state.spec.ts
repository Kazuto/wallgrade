import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readState, STATE_FILE, updateState } from "../../server/utils/state";
import { DEFAULT_SETTINGS } from "../../shared/utils/settings";
import { tempDirectories } from "./helpers";

async function stateFile(source: string) {
  return JSON.parse(await readFile(join(source, STATE_FILE), "utf8"));
}

describe("readState", () => {
  it("starts from the defaults without a file", async () => {
    const { source } = await tempDirectories();

    expect(await readState(source)).toEqual({
      settings: DEFAULT_SETTINGS,
      images: {},
      presets: {},
    });
  });

  it("fills in settings the file does not have", async () => {
    const { source } = await tempDirectories();

    await mkdir(source, { recursive: true });
    await writeFile(
      join(source, STATE_FILE),
      JSON.stringify({ settings: { format: "png", lut: { palette: "nord" } } }),
    );

    const { settings } = await readState(source);

    expect(settings.format).toBe("png");
    expect(settings.lut).toEqual({ ...DEFAULT_SETTINGS.lut, palette: "nord" });
    expect(settings.outputs).toEqual(DEFAULT_SETTINGS.outputs);
  });

  it.each(["{", JSON.stringify({ images: { "a.png": { point: { x: 2 } } } })])(
    "reports a broken file instead of replacing it: %s",
    async (text) => {
      const { source } = await tempDirectories();
      const file = join(source, STATE_FILE);

      await mkdir(source, { recursive: true });
      await writeFile(file, text);

      await expect(readState(source)).rejects.toMatchObject({
        statusCode: 500,
      });
      await expect(
        updateState(source, (state) => {
          state.settings.quality = 10;
        }),
      ).rejects.toMatchObject({ statusCode: 500 });
      expect(await readFile(file, "utf8")).toBe(text);
    },
  );
});

describe("updateState", () => {
  it("writes the change", async () => {
    const { source } = await tempDirectories();

    await updateState(source, (state) => {
      state.images["a.png"] = { point: { x: 0.25, y: 0.75 } };
    });

    expect((await stateFile(source)).images).toEqual({
      "a.png": { point: { x: 0.25, y: 0.75 } },
    });
  });

  it("keeps every one of several changes at once", async () => {
    const { source } = await tempDirectories();
    const names = ["a.png", "b.png", "c.png", "d.png"];

    await Promise.all(
      names.map((name) =>
        updateState(source, (state) => {
          state.images[name] = { skip: true };
        }),
      ),
    );

    expect(Object.keys((await readState(source)).images).sort()).toEqual(names);
  });

  it("drops files that hold nothing but defaults", async () => {
    const { source } = await tempDirectories();

    await updateState(source, (state) => {
      state.images["a.png"] = { point: { x: 0.5, y: 0.5 } };
      state.images["b.png"] = { overrides: { lut: { palette: "nord" } } };
    });
    await updateState(source, (state) => {
      state.images["a.png"] = { skip: false };
      state.images["b.png"]!.overrides = { lut: {} };
    });

    expect((await stateFile(source)).images).toEqual({});
  });

  it("keeps going after a change that throws", async () => {
    const { source } = await tempDirectories();

    await expect(
      updateState(source, () => {
        throw new Error("nope");
      }),
    ).rejects.toThrow("nope");

    await updateState(source, (state) => {
      state.settings.quality = 50;
    });

    expect((await readState(source)).settings.quality).toBe(50);
  });
});
