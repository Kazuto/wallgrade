interface FileChange {
  point?: FocusPoint | null;
  overrides?: FileOverrides | null;
  skip?: boolean;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Changes to single files: focus points, overrides and skipping. */
export function useFiles() {
  const { images, replace } = useLibrary();
  const { settings } = useSettings();
  const { notify } = useNotifications();

  async function patch(paths: string[], change: FileChange) {
    try {
      replace(
        ...(await $fetch<LibraryImage[]>("/api/files", {
          method: "PATCH",
          body: { paths, ...change },
        })),
      );
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  }

  /**
   * Applies a change locally right away and sends it once changes to the same file
   * pause, e.g. while a slider or a focus point is dragged.
   */
  function patchSoon(path: string, change: FileChange) {
    const image = images.value.find((other) => other.path === path);

    if (!image) {
      return;
    }

    if (change.point !== undefined) {
      image.point = change.point;
    }

    if (change.overrides !== undefined) {
      image.overrides = change.overrides ?? {};
    }

    clearTimeout(timers.get(path));
    timers.set(
      path,
      setTimeout(() => {
        timers.delete(path);
        // Sends what the file holds by then, so later changes are included.
        patch([path], { point: image.point, overrides: image.overrides });
      }, 400),
    );
  }

  /** Sets a file's point; files cropped by a strategy switch to their point. */
  function setPoint(image: LibraryImage, point: FocusPoint) {
    // Four decimals are finer than a pixel of any wallpaper.
    const round = (value: number) => Math.round(value * 10_000) / 10_000;
    const overrides = { ...image.overrides };

    if (settings.value?.focus === "manual") {
      delete overrides.focus;
    } else {
      overrides.focus = "manual";
    }

    patchSoon(image.path, {
      point: { x: round(point.x), y: round(point.y) },
      overrides,
    });
  }

  return { patch, patchSoon, setPoint };
}
