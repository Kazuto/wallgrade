<script setup lang="ts">
const { images } = useLibrary();
const { image } = useActiveImage();
const { scope } = useScopedSettings();

const options = computed(() => [
  { value: "all" as const, label: `All files (${images.value.length})` },
  {
    value: "file" as const,
    label: image.value ? `${image.value.name}` : "This file",
    title: image.value?.path,
  },
]);
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-sm text-muted">Settings apply to</span>
    <SegmentedControl
      v-model="scope"
      :options="options"
      label="Settings apply to"
      block
      class="[&>button]:min-w-0 [&>button]:truncate"
    />
    <p v-if="scope === 'file'" class="text-xs text-muted">
      Palette, color and focus changes only affect this file.
    </p>
  </div>
</template>
