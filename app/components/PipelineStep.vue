<script setup lang="ts">
const checked = defineModel<boolean>("checked", { default: false });

defineProps<{
  number: number;
  title: string;
  detail: string;
  active: boolean;
  /** Shows a checkbox that turns the step on and off. */
  checkable?: boolean;
}>();

defineEmits<{ select: [] }>();
</script>

<template>
  <div
    class="flex overflow-hidden rounded-xl border transition-colors"
    :class="
      active
        ? 'border-accent bg-accent/5'
        : 'border-line bg-panel hover:border-line-strong'
    "
  >
    <button
      type="button"
      class="flex min-w-0 flex-1 items-start gap-3.5 px-4 py-3.5 text-left"
      :aria-pressed="active"
      @click="$emit('select')"
    >
      <span
        class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-sm font-semibold"
        :class="active ? 'bg-accent text-on-accent' : 'bg-raised text-muted'"
      >
        {{ number }}
      </span>
      <span class="min-w-0">
        <span class="block font-semibold">{{ title }}</span>
        <span class="block truncate text-sm text-muted">{{ detail }}</span>
      </span>
    </button>
    <label v-if="checkable" class="flex items-center border-l border-line px-5">
      <span class="sr-only">Apply {{ title }}</span>
      <input v-model="checked" type="checkbox" class="size-5" />
    </label>
  </div>
</template>
