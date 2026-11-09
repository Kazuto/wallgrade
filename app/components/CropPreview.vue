<script setup lang="ts">
const props = defineProps<{
  image: Pick<LibraryImage, "width" | "height">;
  target: Size;
  focus: FocusPoint;
  monitors: Rect[];
  /** The preview to crop, e.g. a recolored one. */
  src: string;
  /** Height of the preview; the width follows from the target size. */
  maxHeight?: string;
}>();

// The source preview is scaled and moved so that only the crop shows through.
const imageStyle = computed(() => {
  const crop = coverCrop(props.image, props.target, props.focus);

  return {
    width: `${(props.image.width / crop.width) * 100}%`,
    height: `${(props.image.height / crop.height) * 100}%`,
    left: `${(-crop.x / crop.width) * 100}%`,
    top: `${(-crop.y / crop.height) * 100}%`,
  };
});

const boxStyle = computed(() => {
  const ratio = props.target.width / props.target.height;

  return {
    aspectRatio: `${props.target.width} / ${props.target.height}`,
    width: `min(100%, calc(${props.maxHeight ?? "8rem"} * ${ratio}))`,
  };
});
</script>

<template>
  <div class="relative overflow-hidden rounded-md bg-canvas" :style="boxStyle">
    <img
      :src="src"
      alt=""
      class="absolute max-w-none"
      :style="imageStyle"
      loading="lazy"
    />
    <MonitorOverlay :target="target" :monitors="monitors" />
  </div>
</template>
