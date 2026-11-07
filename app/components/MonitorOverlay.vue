<script setup lang="ts">
const props = defineProps<{
  /** The output size the monitors are laid out in. */
  target: Size;
  monitors: Rect[];
}>();

// The whole output with every monitor cut out; evenodd turns the cut-outs into holes.
const hidden = computed(() => {
  const { width, height } = props.target;
  const holes = props.monitors
    .map((m) => `M${m.x} ${m.y}h${m.width}v${m.height}h${-m.width}z`)
    .join("");

  return `M0 0h${width}v${height}h${-width}z${holes}`;
});
</script>

<template>
  <svg
    v-if="monitors.length > 0"
    class="pointer-events-none absolute inset-0 size-full"
    :viewBox="`0 0 ${target.width} ${target.height}`"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <!-- Parts of the wallpaper no monitor shows. -->
    <path :d="hidden" fill="rgb(17 17 27 / 0.6)" fill-rule="evenodd" />
    <rect
      v-for="(monitor, index) in monitors"
      :key="index"
      :x="monitor.x"
      :y="monitor.y"
      :width="monitor.width"
      :height="monitor.height"
      fill="none"
      stroke="rgb(205 214 244 / 0.7)"
      stroke-width="1.5"
      stroke-dasharray="6 4"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>
