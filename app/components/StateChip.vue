<script setup lang="ts">
defineProps<{ state: ImageState }>();

const labels: Record<ImageState, string> = {
  skipped: "Skipped",
  conflict: "Conflict",
  rendering: "Rendering",
  done: "Done",
  stale: "Outdated",
  ready: "Ready",
};
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
    :class="{
      'border-line bg-raised text-muted':
        state === 'skipped' || state === 'ready',
      'border-danger/30 bg-danger/10 text-danger': state === 'conflict',
      'border-accent/30 bg-accent/10 text-accent': state === 'rendering',
      'border-success/30 bg-success/10 text-success': state === 'done',
      'border-warning/30 bg-warning/10 text-warning': state === 'stale',
    }"
  >
    <Icon
      v-if="state === 'rendering'"
      name="lucide:loader-circle"
      class="size-3 animate-spin"
    />
    {{ labels[state] }}
  </span>
</template>
