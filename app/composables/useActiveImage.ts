/** The file both views work on: the one open in Single, the highlighted one in Batch. */
export function useActiveImage() {
  const { images } = useLibrary();
  const path = useState<string | null>("active-path", () => null);

  const image = computed(
    () =>
      images.value.find((other) => other.path === path.value) ??
      images.value[0],
  );

  return { path, image };
}
