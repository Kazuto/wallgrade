<script setup lang="ts">
const model = defineModel<number>({ required: true });

const props = withDefaults(
  defineProps<{
    label: string;
    min: number;
    max: number;
    step?: number;
    /** Decimals shown next to the label. */
    digits?: number;
    disabled?: boolean;
  }>(),
  { step: 1, digits: 0 },
);
</script>

<template>
  <label
    class="flex flex-col gap-2.5"
    :class="{ 'opacity-50': props.disabled }"
  >
    <span class="flex items-baseline justify-between text-sm">
      {{ props.label }}
      <span class="font-mono text-muted">{{
        model.toFixed(props.digits)
      }}</span>
    </span>
    <input
      v-model.number="model"
      type="range"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :disabled="props.disabled"
    />
  </label>
</template>
