<script setup lang="ts">
import { useEventListener } from "@vueuse/core";

const { upload } = useUpload();
const { path: activePath } = useActiveImage();
const route = useRoute();

const visible = ref(false);
// dragenter and dragleave fire for every element crossed; only the count tells
// when the files left the window.
let depth = 0;

function hasFiles(event: DragEvent) {
  return event.dataTransfer?.types.includes("Files") ?? false;
}

async function add(files: File[]) {
  const paths = await upload(files);

  if (paths.length > 0) {
    activePath.value = paths[0]!;
  }

  // Single shows the new image right away, Batch adds it to the queue.
  if (paths.length === 1 && route.path.startsWith("/edit/")) {
    await navigateTo(`/edit/${encodePath(paths[0]!)}`);
  }
}

useEventListener(window, "dragenter", (event: DragEvent) => {
  if (hasFiles(event)) {
    depth++;
    visible.value = true;
  }
});

useEventListener(window, "dragleave", (event: DragEvent) => {
  if (hasFiles(event) && --depth <= 0) {
    depth = 0;
    visible.value = false;
  }
});

// Without this the browser opens the dropped file instead.
useEventListener(window, "dragover", (event: DragEvent) => {
  if (hasFiles(event)) {
    event.preventDefault();
  }
});

useEventListener(window, "drop", (event: DragEvent) => {
  if (!hasFiles(event)) {
    return;
  }

  event.preventDefault();
  depth = 0;
  visible.value = false;
  add([...(event.dataTransfer?.files ?? [])]);
});

useEventListener(window, "paste", (event: ClipboardEvent) => {
  const target = event.target as HTMLElement;
  const images = [...(event.clipboardData?.files ?? [])].filter((file) =>
    file.type.startsWith("image/"),
  );

  // Pasting text into a field stays pasting text.
  if (images.length === 0 || target.closest("input, textarea")) {
    return;
  }

  event.preventDefault();

  // Browsers name every pasted image image.png.
  const stamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[-:]/g, "")
    .replace("T", "-");

  add(
    images.map(
      (file, index) =>
        new File(
          [file],
          `pasted-${stamp}${index ? `-${index + 1}` : ""}.${file.type.split("/")[1]}`,
          {
            type: file.type,
          },
        ),
    ),
  );
});
</script>

<template>
  <Transition
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
    enter-active-class="transition-opacity"
    leave-active-class="transition-opacity"
  >
    <div
      v-if="visible"
      class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-canvas/85 p-6"
    >
      <div
        class="flex size-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-accent text-accent"
      >
        <Icon name="lucide:image-plus" class="size-12" />
        <p class="text-lg font-semibold">Drop images to add them</p>
      </div>
    </div>
  </Transition>
</template>
