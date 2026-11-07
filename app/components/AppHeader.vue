<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Shows the Single and Batch switch, which pages outside the library leave out. */
    modes?: boolean;
  }>(),
  { modes: true },
);

const route = useRoute();
const { status } = useSettings();
const { image } = useActiveImage();

const mode = computed({
  get: () => (route.path.startsWith("/edit/") ? "single" : "batch"),
  set: (value: "single" | "batch") => {
    if (value === "batch") {
      navigateTo("/");
    } else if (image.value) {
      navigateTo(`/edit/${encodePath(image.value.path)}`);
    }
  },
});

const missingTools = computed(() =>
  status.value
    ? (["lutgen", "vips"] as const).filter((tool) => !status.value![tool])
    : [],
);

const unwritable = computed(() => status.value?.unwritable ?? []);
</script>

<template>
  <header class="border-b border-line">
    <div class="flex min-h-18 flex-wrap items-center gap-4 px-6 py-3">
      <NuxtLink to="/" class="flex items-center gap-2.5 text-lg font-bold">
        <Icon name="lucide:image" class="size-6 text-accent" />
        wallgrade
      </NuxtLink>
      <SegmentedControl
        v-if="props.modes"
        v-model="mode"
        :options="[
          { value: 'single', label: 'Single' },
          { value: 'batch', label: 'Batch' },
        ]"
        label="Mode"
        :disabled="!image"
      />
      <slot name="title" />
      <div class="ml-auto flex items-center gap-3">
        <slot name="actions" />
        <AccountMenu />
      </div>
    </div>

    <p
      v-if="missingTools.length > 0"
      class="border-t border-danger/30 bg-danger/10 px-6 py-2 text-sm text-danger"
      role="alert"
    >
      {{ missingTools.join(" and ") }}
      {{ missingTools.length > 1 ? "are" : "is" }} not installed, rendering
      fails until {{ missingTools.length > 1 ? "they are" : "it is" }}.
    </p>
    <p
      v-if="unwritable.length > 0"
      class="border-t border-danger/30 bg-danger/10 px-6 py-2 text-sm text-danger"
      role="alert"
    >
      wallgrade
      {{ status!.user ? `runs as user ${status!.user}, which` : "" }}
      can't write to {{ unwritable.join(" and ") }}. Uploads, settings and
      renders fail until it can.
    </p>
  </header>
</template>
