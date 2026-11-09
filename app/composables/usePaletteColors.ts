// Names asked for already, so scrolling through results does not ask twice.
const requested = new Set<string>();

/** Colors of lutgen palettes, loaded as pickers show them. */
export function usePaletteColors() {
  const colors = useState<Record<string, string[]>>(
    "palette-colors",
    () => ({}),
  );

  async function request(names: string[]) {
    const missing = [...new Set(names)].filter((name) => !requested.has(name));

    if (missing.length === 0) {
      return;
    }

    missing.forEach((name) => requested.add(name));

    try {
      Object.assign(
        colors.value,
        await $fetch<Record<string, string[]>>("/api/palettes/colors", {
          query: { names: missing.join(",") },
        }),
      );
    } catch {
      missing.forEach((name) => requested.delete(name));
    }
  }

  return { colors, request };
}
