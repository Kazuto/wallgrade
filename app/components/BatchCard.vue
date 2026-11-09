<script setup lang="ts">
import { refDebounced, useElementVisibility } from "@vueuse/core";

const props = defineProps<{
  image: LibraryImage;
  /** The output whose crop is shown. */
  size: string | null;
  mode: CompareMode;
}>();

const { settings } = useSettings();
const { path: activePath } = useActiveImage();
const { ensure, focusFor } = useAutoFocus();
const { setPoint } = useFiles();

const card = useTemplateRef("card");
const visible = useElementVisibility(card);
const draft = ref<FocusPoint | null>(null);

watch(
  visible,
  (isVisible) => {
    if (isVisible) {
      ensure(props.image);
    }
  },
  { immediate: true },
);

const resolved = computed(() =>
  resolveFile(settings.value!, props.image.overrides),
);
const target = computed(() => (props.size ? parseSize(props.size) : null));
const focus = computed(() =>
  props.size
    ? focusFor(props.image, props.size, draft.value ?? props.image.point)
    : CENTER,
);

// Recoloring takes a moment, so it waits until the settings stop changing.
const lutJson = refDebounced(
  computed(() => JSON.stringify(resolved.value.lut)),
  400,
);

const afterUrl = computed(() =>
  previewUrl(
    props.image.path,
    props.image.version,
    480,
    resolved.value.lut.enabled ? lutJson.value : undefined,
  ),
);

const upscale = computed(() =>
  target.value
    ? Math.max(
        target.value.width / props.image.width,
        target.value.height / props.image.height,
      )
    : 1,
);

const coords = computed(() => {
  if (resolved.value.focus !== "manual") {
    return FOCUS_MODES.find((mode) => mode.value === resolved.value.focus)
      ?.label;
  }

  return `${Math.round(focus.value.x * 100)}%, ${Math.round(focus.value.y * 100)}%`;
});

function onMove(point: FocusPoint) {
  activePath.value = props.image.path;
  draft.value = point;
}

function onCommit(point: FocusPoint) {
  draft.value = null;
  setPoint(props.image, point);
}
</script>

<template>
  <article
    ref="card"
    class="flex flex-col overflow-hidden rounded-xl border bg-panel transition-colors"
    :class="[
      image.path === activePath
        ? 'border-accent'
        : 'border-line hover:border-line-strong',
      { 'opacity-45': image.skip },
    ]"
  >
    <CropFrame
      :image="image"
      :before="previewUrl(image.path, image.version, 480)"
      :after="afterUrl"
      :mode="mode"
      :target="target"
      :focus="focus"
      :manual="resolved.focus === 'manual' && !!(draft ?? image.point)"
      :monitors="target ? monitorsFor(settings!.monitors, target) : []"
      small
      @move="onMove"
      @commit="onCommit"
    >
      <div
        class="pointer-events-none absolute inset-x-2 top-2 flex justify-between gap-2"
      >
        <span
          v-if="hasOverrides(image.overrides)"
          class="truncate rounded-md bg-black/75 px-2 py-0.5 text-xs font-medium"
        >
          Override{{
            image.overrides.lut?.palette
              ? ` · ${paletteLabel(image.overrides.lut.palette)}`
              : ""
          }}
        </span>
        <span
          v-if="upscale > 1.05"
          class="ml-auto rounded-md bg-black/75 px-2 py-0.5 text-xs font-medium text-warning"
        >
          Upscale ×{{ upscale.toFixed(2) }}
        </span>
      </div>
    </CropFrame>

    <div class="flex items-center gap-2 px-3.5 py-3 font-mono text-sm">
      <button
        type="button"
        class="min-w-0 flex-1 truncate text-left hover:text-accent"
        :title="`${image.path}, open in Single`"
        @click="
          activePath = image.path;
          navigateTo(`/edit/${encodePath(image.path)}`);
        "
      >
        {{ image.name }}
      </button>
      <span class="shrink-0 text-muted">{{ coords }}</span>
    </div>
  </article>
</template>
