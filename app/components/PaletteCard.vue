<script setup lang="ts">
const props = defineProps<{
  name: string;
  /** Colors as #rrggbb, a placeholder strip while they load. */
  colors?: string[];
  selected: boolean;
}>();

defineEmits<{ select: [] }>();

// Large palettes turn into noise at this size, so a few evenly spaced colors stand in.
const SWATCHES = 10;

const swatches = computed(() => {
  const colors = props.colors ?? [];

  if (colors.length <= SWATCHES) {
    return colors;
  }

  return Array.from(
    { length: SWATCHES },
    (_, index) =>
      colors[Math.round((index * (colors.length - 1)) / (SWATCHES - 1))]!,
  );
});
</script>

<template>
  <button
    type="button"
    class="flex min-w-0 flex-col gap-2.5 rounded-xl border bg-panel p-3 text-left transition-colors"
    :class="
      selected
        ? 'border-accent bg-accent/5'
        : 'border-line hover:border-line-strong'
    "
    :aria-pressed="selected"
    @click="$emit('select')"
  >
    <span class="truncate text-sm font-medium" :title="name">{{
      paletteLabel(name)
    }}</span>
    <span class="flex h-2.5 overflow-hidden rounded-sm bg-raised">
      <span
        v-for="(color, index) in swatches"
        :key="index"
        class="flex-1"
        :style="{ backgroundColor: color }"
      />
    </span>
  </button>
</template>
