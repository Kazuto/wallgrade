<script setup lang="ts">
const { images } = useLibrary();
const { settings } = useSettings();
const { queue, busy, enqueue, cancel } = useConversion();

const selected = computed(() =>
  images.value.filter((image) => !image.skip && !image.conflict),
);
const outputsPerFile = computed(
  () => settings.value!.outputs.filter((output) => output.enabled).length,
);
const total = computed(() => selected.value.length * outputsPerFile.value);
const rendered = computed(
  () =>
    selected.value
      .flatMap((image) => image.outputs)
      .filter((output) => output.status === "done").length,
);
const pending = computed(() =>
  selected.value.reduce((sum, image) => sum + pendingOutputs(image), 0),
);
const anyOnDisk = computed(() =>
  selected.value.some((image) =>
    image.outputs.some((output) => output.status !== "missing"),
  ),
);

const formatLabel = computed(
  () =>
    OUTPUT_FORMATS.find((option) => option.value === settings.value!.format)
      ?.label,
);

const progress = computed(() =>
  busy.value
    ? queue.value.finished / Math.max(1, queue.value.total)
    : rendered.value / Math.max(1, total.value),
);

function render() {
  enqueue(
    selected.value
      .filter((image) => pendingOutputs(image) > 0)
      .map((image) => image.path),
  );
}
</script>

<template>
  <div
    class="fixed inset-x-6 bottom-6 z-20 flex flex-wrap items-center gap-6 rounded-2xl border border-line bg-panel/95 px-6 py-4 shadow-2xl backdrop-blur"
  >
    <div>
      <p class="text-lg font-semibold">
        {{ selected.length }} {{ selected.length === 1 ? "file" : "files" }} ×
        {{ outputsPerFile }} {{ outputsPerFile === 1 ? "output" : "outputs" }} =
        {{ total }} images
      </p>
      <p class="text-sm text-muted">
        {{ formatLabel
        }}{{ settings!.format === "png" ? "" : ` · Q ${settings!.quality}` }} ·
        <template v-if="busy"
          >rendering {{ Math.min(queue.finished + 1, queue.total) }} of
          {{ queue.total }} files</template
        >
        <template v-else-if="rendered === 0">nothing rendered yet</template>
        <template v-else>{{ rendered }} of {{ total }} rendered</template>
      </p>
    </div>

    <div class="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-raised">
      <div
        class="h-full rounded-full bg-accent transition-all"
        :style="{ width: `${progress * 100}%` }"
      />
    </div>

    <AppButton v-if="busy" size="lg" @click="cancel">Stop</AppButton>
    <AppButton v-else size="lg" :disabled="pending === 0" @click="render">
      {{
        pending === 0
          ? "All rendered"
          : `Render ${pending} ${pending === 1 ? "image" : "images"}`
      }}
    </AppButton>
    <a
      href="/outputs.zip"
      download
      :class="[
        buttonClass({ variant: 'primary', size: 'lg' }),
        { 'pointer-events-none opacity-50': !anyOnDisk },
      ]"
      :aria-disabled="!anyOnDisk"
    >
      <Icon name="lucide:download" class="size-4" />
      Download ZIP
    </a>
  </div>
</template>
