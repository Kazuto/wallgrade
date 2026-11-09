<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    image: Pick<LibraryImage, "width" | "height">;
    /** The source preview. */
    before: string;
    /** The recolored preview. */
    after: string;
    mode: CompareMode;
    /** Where the split line sits, from 0 to 1. */
    split?: number;
    /** The output whose crop is shown, none to show the whole image. */
    target: Size | null;
    focus: FocusPoint;
    /** A point set by hand rather than picked by a strategy. */
    manual: boolean;
    monitors?: Rect[];
    /** Clicking and dragging moves the focus point. */
    interactive?: boolean;
    small?: boolean;
  }>(),
  { split: 0.5, monitors: () => [], interactive: true, small: false },
);

const emit = defineEmits<{
  /** While the point moves. */
  move: [focus: FocusPoint];
  /** Once it stops moving. */
  commit: [focus: FocusPoint];
}>();

const frame = useTemplateRef("frame");
const dragging = ref(false);
const afterLoading = ref(false);

watch(
  () => props.after,
  () => {
    afterLoading.value = true;
  },
);

const crop = computed(() =>
  props.target ? coverCrop(props.image, props.target, props.focus) : null,
);

const cropStyle = computed(() => {
  const rect = crop.value!;

  return {
    left: `${(rect.x / props.image.width) * 100}%`,
    top: `${(rect.y / props.image.height) * 100}%`,
    width: `${(rect.width / props.image.width) * 100}%`,
    height: `${(rect.height / props.image.height) * 100}%`,
  };
});

const handleLabel = computed(() => {
  const x = Math.round(props.focus.x * 100);
  const y = Math.round(props.focus.y * 100);

  return `Focus point at ${x}% from the left and ${y}% from the top. Arrow keys move it.`;
});

/** The point under the pointer, kept inside the image. */
function pointAt(event: PointerEvent): FocusPoint {
  const rect = frame.value!.getBoundingClientRect();

  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
  };
}

function onPointerDown(event: PointerEvent) {
  if (!props.interactive || !props.target || event.button !== 0) {
    return;
  }

  dragging.value = true;
  frame.value!.setPointerCapture(event.pointerId);
  emit("move", pointAt(event));
}

function onPointerMove(event: PointerEvent) {
  if (dragging.value) {
    emit("move", pointAt(event));
  }
}

function onPointerUp(event: PointerEvent) {
  if (dragging.value) {
    dragging.value = false;
    emit("commit", pointAt(event));
  }
}

const STEPS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

function onKeydown(event: KeyboardEvent) {
  const step = STEPS[event.key];

  if (!step) {
    return;
  }

  // Pages use the arrow keys to switch images otherwise.
  event.preventDefault();
  event.stopPropagation();

  const distance = event.shiftKey ? 0.05 : 0.01;

  emit("commit", {
    x: clamp(props.focus.x + step[0] * distance, 0, 1),
    y: clamp(props.focus.y + step[1] * distance, 0, 1),
  });
}
</script>

<template>
  <div
    ref="frame"
    class="relative touch-none overflow-hidden bg-canvas select-none"
    :class="{ 'cursor-crosshair': interactive && target }"
    :style="{ aspectRatio: `${image.width} / ${image.height}` }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <img
      v-if="mode !== 'after'"
      :src="before"
      alt=""
      class="absolute inset-0 size-full"
      draggable="false"
      loading="lazy"
    />
    <img
      v-if="mode !== 'before'"
      :src="after"
      alt=""
      class="absolute inset-0 size-full"
      :style="
        mode === 'split'
          ? { clipPath: `inset(0 0 0 ${split * 100}%)` }
          : undefined
      "
      draggable="false"
      loading="lazy"
      @load="afterLoading = false"
      @error="afterLoading = false"
    />
    <div
      v-if="mode === 'split'"
      class="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-fg"
      :style="{ left: `${split * 100}%` }"
    />

    <template v-if="crop">
      <!-- The shadow darkens everything outside the crop. -->
      <div
        class="pointer-events-none absolute border-2 border-accent shadow-[0_0_0_9999px_rgb(10_12_20/0.55)]"
        :class="{ 'transition-all duration-150': !dragging }"
        :style="cropStyle"
      >
        <MonitorOverlay :target="target!" :monitors="monitors" />
        <slot name="crop" />
      </div>

      <button
        v-if="interactive"
        type="button"
        class="absolute flex -translate-1/2 cursor-grab items-center justify-center rounded-full border-2 shadow-lg backdrop-blur-sm"
        :class="[
          small ? 'size-6' : 'size-9',
          manual
            ? 'border-fg bg-accent/40'
            : 'border-dashed border-fg/80 bg-black/30',
          { 'transition-all duration-150': !dragging },
        ]"
        :style="{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }"
        :aria-label="handleLabel"
        @keydown="onKeydown"
      >
        <span class="size-1.5 rounded-full bg-accent" />
      </button>
    </template>

    <slot />

    <span
      v-if="afterLoading && mode !== 'before'"
      class="absolute right-2 bottom-2 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-xs"
    >
      <Icon name="lucide:loader-circle" class="size-3 animate-spin" />
      Recoloring
    </span>
  </div>
</template>
