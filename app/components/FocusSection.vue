<script setup lang="ts">
const { resolved, setFocus } = useScopedSettings();

const mode = computed({
  get: () => resolved.value.focus,
  set: setFocus,
});

const hints: Record<FocusMode, string> = {
  manual:
    "Each file keeps its own point, shared across all outputs. Files without one start where attention would crop.",
  centre: "Crops from the middle of every file.",
  attention: "libvips looks for skin tones, saturated colors and edges.",
  entropy: "libvips keeps the busiest part of the image.",
};
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <SegmentedControl
      v-model="mode"
      :options="FOCUS_MODES"
      label="Focus"
      block
    />
    <p class="text-sm text-muted">{{ hints[mode] }}</p>
  </div>
</template>
