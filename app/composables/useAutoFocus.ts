// Requested already, by path and version, so cards scrolling by ask only once.
const requested = new Set<string>();

/** Where attention and entropy crop each file, loaded as files come into view. */
export function useAutoFocus() {
  const auto = useState<Record<string, Record<string, AutoFocus>>>(
    "auto-focus",
    () => ({}),
  );
  const { settings } = useSettings();

  function key(image: LibraryImage) {
    const sizes = image.outputs.map((output) => output.size).join(",");

    return `${image.path}\0${image.version}\0${sizes}`;
  }

  async function ensure(image: LibraryImage) {
    const id = key(image);

    if (requested.has(id)) {
      return;
    }

    requested.add(id);

    try {
      const detail = await $fetch<ImageDetail>(
        `/api/images/${encodePath(image.path)}`,
      );

      auto.value[id] = detail.auto;
    } catch {
      requested.delete(id);
    }
  }

  /** Where the file is cropped for a size, with an optional point being dragged. */
  function focusFor(
    image: LibraryImage,
    size: string,
    point: FocusPoint | null = image.point,
  ): FocusPoint {
    const { focus } = resolveFile(settings.value!, image.overrides);

    return focusPointFor(focus, point, auto.value[key(image)]?.[size]);
  }

  return { ensure, focusFor };
}
