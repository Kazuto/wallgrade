<script setup lang="ts">
const { images, loaded } = useLibrary();
const { settings, status } = useSettings();
const { image: active } = useActiveImage();
const { session } = useAccount();

const mode = useState<CompareMode>("batch-compare", () => "after");
// The output whose crop the thumbnails show, shared with Single.
const cropSize = useState<string | null>("crop-size", () => null);

const enabledOutputs = computed(
  () => settings.value?.outputs.filter((output) => output.enabled) ?? [],
);

const currentSize = computed(
  () =>
    enabledOutputs.value.find((output) => output.size === cropSize.value)
      ?.size ??
    enabledOutputs.value[0]?.size ??
    null,
);

const cropOptions = computed(() =>
  enabledOutputs.value.map((output) => ({
    value: output.size,
    label: aspectLabel(parseSize(output.size)!),
    title: `${output.name}, ${output.size}`,
  })),
);

const cropModel = computed({
  get: () => currentSize.value ?? "",
  set: (value: string) => {
    cropSize.value = value;
  },
});
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppHeader>
      <template #actions>
        <OpenImageButton label="Add files" icon="lucide:plus" />
        <PresetMenu />
      </template>
    </AppHeader>

    <div
      v-if="!loaded || !settings"
      class="flex flex-1 items-center justify-center text-muted"
    >
      <Icon name="lucide:loader-circle" class="size-6 animate-spin" />
    </div>

    <div
      v-else-if="images.length === 0"
      class="m-6 flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-line-strong p-8 text-center"
    >
      <Icon name="lucide:image-plus" class="size-12 text-faint" />
      <p class="text-lg font-semibold">No images yet</p>
      <p class="max-w-md text-sm text-muted">
        Drop images anywhere on this page, paste one or use “Add files”.
        <template v-if="!session?.users">
          To work on a folder you already have, start wallgrade with
          NUXT_SOURCE_DIR pointing at it.
        </template>
      </p>
      <p
        v-if="status && !session?.users"
        class="font-mono text-xs break-all text-faint"
      >
        {{ status.sourceDir }}
      </p>
    </div>

    <div
      v-else
      class="grid flex-1 gap-6 px-6 pt-6 pb-36 xl:grid-cols-[20rem_minmax(0,1fr)_26rem]"
    >
      <QueueList
        class="xl:sticky xl:top-6 xl:max-h-[calc(100dvh-14rem)] xl:self-start"
      />

      <section class="flex min-w-0 flex-col gap-5">
        <div class="flex flex-wrap items-center gap-4">
          <SegmentedControl
            v-model="mode"
            :options="[
              { value: 'after', label: 'After' },
              { value: 'before', label: 'Before' },
            ]"
            label="Compare"
          />
          <div v-if="cropOptions.length > 0" class="flex items-center gap-3">
            <span class="text-sm text-muted">Crop preview</span>
            <SegmentedControl
              v-model="cropModel"
              :options="cropOptions"
              label="Crop preview"
              mono
            />
          </div>
          <p class="ml-auto text-sm text-muted">
            Click a thumbnail to set its focus point
          </p>
        </div>

        <div class="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-5">
          <BatchCard
            v-for="image in images"
            :key="image.path"
            :image="image"
            :size="currentSize"
            :mode="mode"
          />
        </div>
      </section>

      <BatchSettings
        v-if="active"
        class="xl:sticky xl:top-6 xl:max-h-[calc(100dvh-14rem)] xl:self-start xl:overflow-y-auto"
      />
    </div>

    <BottomBar v-if="loaded && settings && images.length > 0" />
  </div>
</template>
