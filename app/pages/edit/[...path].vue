<script setup lang="ts">
import { refDebounced, useEventListener } from "@vueuse/core";

type Step = "lut" | "resize" | "focus" | "export";

const route = useRoute();
const { images, loaded } = useLibrary();
const { settings } = useSettings();
const { path: activePath } = useActiveImage();
const { ensure, focusFor } = useAutoFocus();
const { setPoint, patch } = useFiles();
const { resolved: scoped, setLut } = useScopedSettings();
const { enqueue, isQueued } = useConversion();

const step = useState<Step>("single-step", () => "focus");
const mode = useState<CompareMode>("single-compare", () => "split");
const split = useState("single-split", () => 0.5);
const showCrop = useState("single-show-crop", () => true);
// The output whose crop is shown, shared with Batch.
const cropSize = useState<string | null>("crop-size", () => null);

// The point while it is dragged, saved once it is let go.
const draft = ref<FocusPoint | null>(null);

const path = computed(() => [route.params.path ?? []].flat().join("/"));
const image = computed(() =>
  images.value.find((other) => other.path === path.value),
);

watch(
  path,
  (value) => {
    activePath.value = value;
    draft.value = null;
  },
  { immediate: true },
);

watch(
  image,
  (value) => {
    if (value) {
      ensure(value);
    }
  },
  { immediate: true },
);

const index = computed(() =>
  images.value.findIndex((other) => other.path === path.value),
);
const previous = computed(() => images.value[index.value - 1]);
const next = computed(() => images.value[index.value + 1]);

/** What this file is rendered with, whichever scope the panels edit. */
const file = computed(() =>
  resolveFile(settings.value ?? DEFAULT_SETTINGS, image.value?.overrides ?? {}),
);

const output = computed(
  () =>
    image.value?.outputs.find(
      (candidate) => candidate.size === cropSize.value,
    ) ?? image.value?.outputs[0],
);
const target = computed(() =>
  output.value ? parseSize(output.value.size) : null,
);

const focus = computed(() =>
  image.value && output.value
    ? focusFor(image.value, output.value.size, draft.value ?? image.value.point)
    : CENTER,
);

// Recoloring takes a moment, so it waits until the settings stop changing.
const lutJson = refDebounced(
  computed(() => JSON.stringify(file.value.lut)),
  300,
);

const before = computed(() =>
  previewUrl(path.value, image.value!.version, 1920),
);
const after = computed(() =>
  file.value.lut.enabled
    ? previewUrl(path.value, image.value!.version, 1920, lutJson.value)
    : before.value,
);

const monitors = computed(() =>
  target.value ? monitorsFor(settings.value!.monitors, target.value) : [],
);

const scale = computed(() =>
  target.value
    ? Math.max(
        target.value.width / image.value!.width,
        target.value.height / image.value!.height,
      )
    : 1,
);

const formatLabel = computed(
  () =>
    OUTPUT_FORMATS.find(
      (option) => option.value === (settings.value ?? DEFAULT_SETTINGS).format,
    )!.label,
);

const commands = computed(() => {
  if (!image.value || !output.value || !target.value) {
    return [];
  }

  return pipelineCommands({
    source: image.value.path.split("/").pop()!,
    output: output.value.file.split("/").pop()!,
    crop: coverCrop(image.value, target.value, focus.value),
    size: target.value,
    lut: file.value.lut,
    format: settings.value!.format,
    quality: settings.value!.quality,
  });
});

const steps = computed(() => {
  const { lut, focus: focusMode } = file.value;
  const point =
    focusMode === "manual"
      ? `Manual · ${Math.round(focus.value.x * 100)}%, ${Math.round(focus.value.y * 100)}%`
      : FOCUS_MODES.find((option) => option.value === focusMode)!.label;

  return [
    {
      id: "lut" as const,
      title: "Apply LUT",
      detail: lut.enabled
        ? `${paletteLabel(lut.palette)} · ${algorithmLabel(lut.algorithm)}`
        : "Off, original colors",
    },
    {
      id: "resize" as const,
      title: "Resize / upscale",
      detail: target.value
        ? `${target.value.width} × ${target.value.height} · lanczos3`
        : "No output enabled",
    },
    { id: "focus" as const, title: "Focus point", detail: point },
    {
      id: "export" as const,
      title: "Export",
      detail:
        settings.value!.format === "png"
          ? formatLabel.value
          : `${formatLabel.value} · Q ${settings.value!.quality}`,
    },
  ];
});

const lutEnabled = computed({
  get: () => scoped.value.lut.enabled,
  set: (enabled: boolean) => setLut({ enabled }),
});

const cropOptions = computed(() =>
  (image.value?.outputs ?? []).map((candidate) => ({
    value: candidate.size,
    label: aspectLabel(parseSize(candidate.size)!),
    title: `${candidate.name}, ${candidate.size}`,
  })),
);

const cropModel = computed({
  get: () => output.value?.size ?? "",
  set: (value: string) => {
    cropSize.value = value;
  },
});

const rendering = computed(() => isQueued(path.value));
const allDone = computed(() =>
  image.value?.outputs.every((candidate) => candidate.status === "done"),
);

function onMove(point: FocusPoint) {
  draft.value = point;
}

function onCommit(point: FocusPoint) {
  draft.value = null;
  setPoint(image.value!, point);
}

function render() {
  enqueue([path.value], allDone.value);
}

useEventListener(window, "keydown", (event: KeyboardEvent) => {
  const element = event.target as HTMLElement;

  if (
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    element.closest("input, textarea, select")
  ) {
    return;
  }

  const to = {
    ArrowLeft: previous.value && `/edit/${encodePath(previous.value.path)}`,
    ArrowRight: next.value && `/edit/${encodePath(next.value.path)}`,
    Escape: "/",
  }[event.key];

  if (to) {
    event.preventDefault();
    navigateTo(to);
  }
});
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppHeader>
      <template v-if="image" #title>
        <span
          class="hidden min-w-0 items-center gap-2 rounded-lg border border-line px-3 py-1.5 font-mono text-sm md:flex"
        >
          <span class="truncate" :title="image.path">{{
            image.path.split("/").pop()
          }}</span>
          <span class="shrink-0 text-muted">
            {{ image.width }} × {{ image.height }} ·
            {{ image.format.toUpperCase() }}
          </span>
        </span>
      </template>
      <template #actions>
        <OpenImageButton label="Open image" icon="lucide:upload" />
        <a
          v-if="output"
          :href="
            output.status === 'missing'
              ? undefined
              : outputUrl(output.file, output.version)
          "
          :download="output.file.split('/').pop()"
          :class="[
            buttonClass({ variant: 'primary', size: 'lg' }),
            { 'pointer-events-none opacity-50': output.status === 'missing' },
          ]"
          :aria-disabled="output.status === 'missing'"
          :title="
            output.status === 'stale'
              ? 'This file is outdated, render it again first'
              : undefined
          "
        >
          <Icon name="lucide:download" class="size-4" />
          Download {{ formatLabel }}
        </a>
      </template>
    </AppHeader>

    <div
      v-if="!loaded || !settings"
      class="flex flex-1 items-center justify-center text-muted"
    >
      <Icon name="lucide:loader-circle" class="size-6 animate-spin" />
    </div>

    <div
      v-else-if="!image"
      class="flex flex-1 flex-col items-center justify-center gap-3 text-muted"
    >
      <Icon name="lucide:image-off" class="size-10" />
      <p>{{ path }} is not in the library.</p>
      <AppButton to="/" icon="lucide:arrow-left">Back to Batch</AppButton>
    </div>

    <div
      v-else
      class="grid flex-1 gap-6 p-6 xl:grid-cols-[20rem_minmax(0,1fr)_26rem]"
    >
      <aside class="flex flex-col gap-3">
        <h2 class="eyebrow mb-1">Pipeline</h2>
        <PipelineStep
          v-for="(item, number) in steps"
          :key="item.id"
          v-model:checked="lutEnabled"
          :number="number + 1"
          :title="item.title"
          :detail="item.detail"
          :active="step === item.id"
          :checkable="item.id === 'lut'"
          @select="step = item.id"
        />
        <SourceBox :image="image" class="mt-3" />
        <div class="flex gap-2">
          <AppButton
            class="flex-1"
            variant="ghost"
            icon="lucide:chevron-left"
            :to="previous ? `/edit/${encodePath(previous.path)}` : undefined"
            :class="{ 'pointer-events-none opacity-40': !previous }"
          >
            Previous
          </AppButton>
          <AppButton
            class="flex-1"
            variant="ghost"
            :to="next ? `/edit/${encodePath(next.path)}` : undefined"
            :class="{ 'pointer-events-none opacity-40': !next }"
          >
            Next
            <Icon name="lucide:chevron-right" class="size-4" />
          </AppButton>
        </div>
      </aside>

      <section class="flex min-w-0 flex-col gap-4">
        <CropFrame
          class="rounded-xl border border-line"
          :image="image"
          :before="before"
          :after="after"
          :mode="mode"
          :split="split"
          :target="showCrop ? target : null"
          :focus="focus"
          :manual="file.focus === 'manual' && !!(draft ?? image.point)"
          :monitors="monitors"
          @move="onMove"
          @commit="onCommit"
        >
          <span
            v-if="mode !== 'after'"
            class="pointer-events-none absolute top-3 left-3 rounded-md bg-black/75 px-2.5 py-1 text-sm font-medium"
          >
            Before
          </span>
          <span
            v-if="mode !== 'before'"
            class="pointer-events-none absolute top-3 right-3 rounded-md bg-black/75 px-2.5 py-1 text-sm font-medium"
          >
            After ·
            {{
              file.lut.enabled
                ? paletteLabel(file.lut.palette)
                : "original colors"
            }}
          </span>
          <template #crop>
            <span
              class="absolute bottom-2 left-2 rounded-md bg-black/75 px-2 py-1 font-mono text-sm"
            >
              {{ target?.width }} × {{ target?.height }}
            </span>
          </template>
        </CropFrame>

        <div class="flex flex-wrap items-center gap-4">
          <SegmentedControl
            v-model="mode"
            :options="[
              { value: 'split', label: 'Split' },
              { value: 'before', label: 'Before' },
              { value: 'after', label: 'After' },
            ]"
            label="Compare"
          />
          <label
            v-if="mode === 'split'"
            class="flex items-center gap-3 text-muted"
          >
            Split
            <input
              v-model.number="split"
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="w-40"
            />
          </label>
          <label class="flex items-center gap-2">
            <input v-model="showCrop" type="checkbox" />
            Show crop
          </label>
          <SegmentedControl
            v-if="cropOptions.length > 1"
            v-model="cropModel"
            :options="cropOptions"
            label="Output"
            mono
          />
          <AppButton
            class="ml-auto"
            size="lg"
            :loading="rendering"
            :disabled="!!image.conflict || image.outputs.length === 0"
            @click="render"
          >
            {{
              rendering
                ? "Rendering"
                : allDone
                  ? "Render again"
                  : "Render full size"
            }}
          </AppButton>
        </div>

        <div
          v-if="target && output"
          class="flex flex-col gap-1 font-mono text-sm text-muted"
        >
          <p class="flex flex-wrap gap-x-6">
            <span>Preview · 1920 px</span>
            <span>Source {{ image.width }} × {{ image.height }}</span>
            <span>
              Scaled {{ Math.round(image.width * scale) }} ×
              {{ Math.round(image.height * scale) }} ({{
                scale > 1 ? "upscale" : "downscale"
              }}
              ×{{ scale.toFixed(2) }})
            </span>
          </p>
          <p class="flex flex-wrap items-center gap-x-3 text-fg">
            Output {{ target.width }} × {{ target.height }} · {{ formatLabel }}
            <StateChip
              :state="
                rendering
                  ? 'rendering'
                  : output.status === 'done'
                    ? 'done'
                    : output.status === 'stale'
                      ? 'stale'
                      : 'ready'
              "
              class="font-sans"
            />
          </p>
          <p v-if="image.conflict" class="font-sans text-danger" role="alert">
            {{ image.conflict }} would be written to the same file; change the
            template or rename one of them.
          </p>
        </div>

        <CommandsPanel v-if="commands.length > 0" :commands="commands" />
      </section>

      <aside class="flex flex-col gap-6">
        <StepPanel
          v-if="step === 'lut'"
          title="Apply LUT"
          description="lutgen builds a Hald CLUT from a palette and maps every pixel onto it."
        >
          <ScopeToggle />
          <div class="flex flex-col gap-3">
            <h3 class="text-sm font-semibold text-muted">Palette</h3>
            <PaletteSection />
          </div>
          <LutTune />
        </StepPanel>

        <StepPanel
          v-else-if="step === 'resize'"
          title="Resize / upscale"
          description="Each output scales the source until it covers the size, with lanczos3, and crops the rest around the focus point. Outputs are the same for every file."
        >
          <OutputsSection monitors />
        </StepPanel>

        <StepPanel
          v-else-if="step === 'focus'"
          title="Focus point"
          description="Click or drag on the preview to choose where the crop centers. One point serves every output: wide ones use its height, tall ones its width."
        >
          <ScopeToggle />
          <FocusSection />
          <div
            v-if="file.focus === 'manual' && image.point"
            class="flex items-center gap-3"
          >
            <span class="font-mono text-sm text-muted">
              {{ Math.round(image.point.x * 100) }}%,
              {{ Math.round(image.point.y * 100) }}%
            </span>
            <AppButton
              variant="ghost"
              size="sm"
              class="ml-auto"
              @click="patch([image.path], { point: null })"
            >
              Clear point
            </AppButton>
          </div>
          <ul class="flex flex-col gap-3">
            <li v-for="candidate in image.outputs" :key="candidate.size">
              <button
                type="button"
                class="flex w-full flex-col gap-2 rounded-xl border p-3 text-left transition-colors"
                :class="
                  candidate.size === output?.size
                    ? 'border-accent bg-accent/5'
                    : 'border-line hover:border-line-strong'
                "
                :aria-pressed="candidate.size === output?.size"
                @click="cropSize = candidate.size"
              >
                <span class="flex justify-between text-sm">
                  {{ candidate.name }}
                  <span class="font-mono text-muted">{{
                    candidate.size.replace("x", " × ")
                  }}</span>
                </span>
                <CropPreview
                  :image="image"
                  :src="
                    mode === 'before'
                      ? previewUrl(image.path, image.version, 480)
                      : previewUrl(
                          image.path,
                          image.version,
                          480,
                          file.lut.enabled ? lutJson : undefined,
                        )
                  "
                  :target="parseSize(candidate.size)!"
                  :focus="focusFor(image, candidate.size, draft ?? image.point)"
                  :monitors="
                    monitorsFor(settings!.monitors, parseSize(candidate.size)!)
                  "
                  max-height="8rem"
                />
              </button>
            </li>
          </ul>
        </StepPanel>

        <StepPanel
          v-else
          title="Export"
          description="Encodes every output with libvips and writes it below the output folder. The format is the same for every file."
        >
          <FormatSection />
          <ul class="flex flex-col gap-2">
            <li
              v-for="candidate in image.outputs"
              :key="candidate.file"
              class="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5"
            >
              <span class="min-w-0 flex-1">
                <span class="block text-sm">{{ candidate.name }}</span>
                <span
                  class="block truncate font-mono text-xs text-muted"
                  :title="candidate.file"
                >
                  {{ candidate.file }}
                </span>
              </span>
              <a
                v-if="candidate.status !== 'missing'"
                :href="outputUrl(candidate.file, candidate.version)"
                :download="candidate.file.split('/').pop()"
                :class="buttonClass({ variant: 'ghost', size: 'icon' })"
                :aria-label="`Download ${candidate.name}`"
              >
                <Icon name="lucide:download" class="size-4" />
              </a>
            </li>
          </ul>
        </StepPanel>
      </aside>
    </div>
  </div>
</template>
