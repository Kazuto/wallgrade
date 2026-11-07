<script setup lang="ts" generic="T extends string">
const model = defineModel<T>({ required: true });

defineProps<{
  options: { value: T; label: string; title?: string }[];
  /** Names the group for screen readers. */
  label: string;
  mono?: boolean;
  /** Stretches the options over the full width. */
  block?: boolean;
  disabled?: boolean;
}>();
</script>

<template>
  <div
    class="flex gap-1 rounded-xl border border-line bg-panel p-1"
    :class="{ 'w-full': block, 'pointer-events-none opacity-50': disabled }"
    role="group"
    :aria-label="label"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="h-8 rounded-lg px-3 text-sm whitespace-nowrap transition-colors"
      :class="[
        model === option.value
          ? 'bg-accent font-medium text-on-accent'
          : 'text-fg/80 hover:bg-raised hover:text-fg',
        { 'font-mono': mono, 'flex-1': block },
      ]"
      :title="option.title"
      :aria-pressed="model === option.value"
      :disabled="disabled"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
