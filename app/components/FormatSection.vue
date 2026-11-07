<script setup lang="ts">
const { settings, update } = useSettings();
const { image } = useActiveImage();
const { fileScope } = useScopedSettings();

const template = ref(settings.value!.template);

const problem = computed(() => templateProblem(template.value.trim()));

const format = computed({
  get: () => settings.value!.format,
  set: (value: OutputFormat) =>
    update((draft) => {
      draft.format = value;
    }),
});

const quality = computed({
  get: () => settings.value!.quality,
  set: (value: number) =>
    update((draft) => {
      draft.quality = value;
    }),
});

const lossy = computed(
  () => OUTPUT_FORMATS.find((option) => option.value === format.value)?.lossy,
);

// Only templates that work are saved; the field keeps what is typed.
watch(template, (value) => {
  if (!problem.value) {
    update((draft) => {
      draft.template = value.trim();
    });
  }
});

watch(
  () => settings.value!.template,
  (value) => {
    if (value !== template.value.trim()) {
      template.value = value;
    }
  },
);
</script>

<template>
  <div
    class="flex flex-col gap-5"
    :class="{ 'pointer-events-none opacity-50': fileScope }"
  >
    <SegmentedControl
      v-model="format"
      :options="OUTPUT_FORMATS"
      label="Format"
      mono
      block
    />

    <RangeField
      v-model="quality"
      label="Quality"
      :min="1"
      :max="100"
      :disabled="!lossy"
    />

    <label class="flex flex-col gap-2 text-sm">
      File name template
      <input v-model="template" class="field font-mono" spellcheck="false" />
      <span class="text-xs text-muted">
        Tokens: {{ TEMPLATE_TOKENS.join(" ") }}. Slashes make folders.
      </span>
    </label>

    <p v-if="problem" class="text-sm text-danger" role="alert">{{ problem }}</p>
    <ul
      v-else-if="image && image.outputs.length > 0"
      class="flex flex-col gap-1 rounded-lg bg-canvas p-3 font-mono text-xs text-muted"
    >
      <li
        v-for="output in image.outputs"
        :key="output.file"
        class="truncate"
        :title="output.file"
      >
        {{ output.file }}
      </li>
    </ul>

    <p v-if="fileScope" class="text-xs text-muted">
      The format is the same for every file.
    </p>
  </div>
</template>
