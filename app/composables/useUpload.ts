/** Adds dropped or picked files to the source directory. */
export function useUpload() {
  const uploading = useState("uploading", () => false);
  const { notify } = useNotifications();

  /** Returns the paths of the added images. */
  async function upload(files: File[]): Promise<string[]> {
    if (files.length === 0) {
      return [];
    }

    const form = new FormData();

    for (const file of files) {
      form.append("files", file);
    }

    uploading.value = true;

    try {
      const { paths, rejected } = await $fetch<{
        paths: string[];
        rejected: string[];
      }>("/api/upload", { method: "POST", body: form });

      if (rejected.length > 0) {
        notify(`Not an image: ${rejected.join(", ")}`, "error");
      }

      if (paths.length > 1) {
        notify(`Added ${paths.length} images`);
      }

      await useLibrary().refresh();

      return paths;
    } catch (error) {
      notify(errorMessage(error), "error");

      return [];
    } finally {
      uploading.value = false;
    }
  }

  return { uploading, upload };
}
