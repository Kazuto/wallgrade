<script setup lang="ts">
const { images } = useLibrary();
const { path: activePath, image: active } = useActiveImage();
const { patch } = useFiles();
const { isQueued } = useConversion();

const search = ref("");

const selected = computed(() => images.value.filter((image) => !image.skip));

const visible = computed(() => {
  const query = search.value.trim().toLowerCase();

  return query
    ? images.value.filter((image) => image.path.toLowerCase().includes(query))
    : images.value;
});

const allSelected = computed(
  () => selected.value.length === images.value.length,
);

function toggleAll() {
  patch(
    images.value.map((image) => image.path),
    { skip: allSelected.value },
  );
}
</script>

<template>
  <div class="flex min-h-0 flex-col gap-3">
    <div class="flex items-center justify-between gap-3">
      <h2 class="eyebrow">
        Queue · {{ selected.length }} of {{ images.length }}
      </h2>
      <AppButton size="sm" :disabled="images.length === 0" @click="toggleAll">
        {{ allSelected ? "Select none" : "Select all" }}
      </AppButton>
    </div>

    <label v-if="images.length > 8" class="relative">
      <span class="sr-only">Filter the queue</span>
      <Icon
        name="lucide:search"
        class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint"
      />
      <input
        v-model="search"
        type="search"
        class="field pl-9"
        placeholder="Filter"
      />
    </label>

    <ul class="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
      <li
        v-for="image in visible"
        :key="image.path"
        class="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors"
        :class="
          image.path === active?.path
            ? 'border-accent bg-accent/5'
            : 'border-line bg-panel hover:border-line-strong'
        "
      >
        <input
          type="checkbox"
          :checked="!image.skip"
          :aria-label="`Render ${image.name}`"
          @change="patch([image.path], { skip: !image.skip })"
        />
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-3 text-left"
          :aria-current="image.path === active?.path"
          @click="activePath = image.path"
        >
          <img
            :src="previewUrl(image.path, image.version, 480)"
            alt=""
            class="h-9 w-14 shrink-0 rounded object-cover"
            loading="lazy"
          />
          <span class="min-w-0 flex-1">
            <span
              class="block truncate font-mono text-sm"
              :title="image.path"
              >{{ image.name }}</span
            >
            <span class="block font-mono text-xs text-muted">
              {{ image.width }} × {{ image.height }}
            </span>
          </span>
        </button>
        <StateChip :state="imageState(image, isQueued(image.path))" />
      </li>
    </ul>

    <p
      class="rounded-xl border border-dashed border-line-strong px-4 py-3.5 text-sm text-muted"
    >
      Drop images anywhere or paste one from the clipboard to add it to the
      queue.
    </p>
  </div>
</template>
