<script setup lang="ts">
const props = defineProps<{ image: LibraryImage }>();
const emit = defineEmits<{ delete: [] }>();

const file = computed(() => props.image.path.split("/").pop());
const bits = computed(() => `${props.image.depth}-bit`);
const space = computed(() =>
  props.image.space === "srgb" ? "sRGB" : props.image.space.toUpperCase(),
);
</script>

<template>
  <div
    class="flex flex-col gap-2 rounded-xl border border-dashed border-line-strong px-5 py-4"
  >
    <h3 class="font-semibold">Source</h3>
    <p class="text-sm text-muted">
      Drop an image anywhere or paste one from the clipboard to add it next to
      <span class="font-mono text-fg/80">{{ file }}</span
      >.
    </p>
    <p class="font-mono text-sm text-muted">
      {{ image.width }} × {{ image.height }} · {{ space }} · {{ bits }}
    </p>
    <p
      v-if="image.folder"
      class="truncate font-mono text-xs text-faint"
      :title="image.path"
    >
      {{ image.folder }}/
    </p>
    <div class="mt-1 flex gap-2">
      <a
        :href="originalUrl(image.path, image.version)"
        :download="file"
        :class="buttonClass({ size: 'sm' })"
      >
        <Icon name="lucide:file-down" class="size-4" />
        Original
      </a>
      <AppButton
        variant="ghost"
        size="sm"
        icon="lucide:trash-2"
        @click="emit('delete')"
        >Delete</AppButton
      >
    </div>
  </div>
</template>
