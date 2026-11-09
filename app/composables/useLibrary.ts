/** Every source image and the state of its outputs, shared by all pages. */
export function useLibrary() {
  const images = useState<LibraryImage[]>("library", () => []);
  const loaded = useState("library-loaded", () => false);

  async function refresh() {
    images.value = await $fetch<LibraryImage[]>("/api/images");
    loaded.value = true;
  }

  /** Loads the library unless that already happened. */
  async function ensureLoaded() {
    if (!loaded.value) {
      await refresh();
    }
  }

  /** Puts changed images in place, e.g. after a render. */
  function replace(...changed: LibraryImage[]) {
    for (const image of changed) {
      const index = images.value.findIndex(
        (other) => other.path === image.path,
      );

      if (index !== -1) {
        images.value[index] = image;
      }
    }
  }

  return { images, loaded, refresh, ensureLoaded, replace };
}
