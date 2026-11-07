export type ImageState =
  "skipped" | "conflict" | "rendering" | "done" | "stale" | "ready";

/** One word for where a file stands, as the queue shows it. */
export function imageState(
  image: LibraryImage,
  rendering: boolean,
): ImageState {
  if (image.skip) {
    return "skipped";
  }

  if (image.conflict) {
    return "conflict";
  }

  if (rendering) {
    return "rendering";
  }

  if (image.outputs.every((output) => output.status === "done")) {
    return "done";
  }

  return image.outputs.some((output) => output.status === "stale")
    ? "stale"
    : "ready";
}

/** Outputs a render would write: files that are not skipped, without the done ones. */
export function pendingOutputs(image: LibraryImage): number {
  if (image.skip || image.conflict) {
    return 0;
  }

  return image.outputs.filter((output) => output.status !== "done").length;
}
