<script setup lang="ts">
defineProps<{ label: string; icon: string }>();

const { uploading, upload } = useUpload();
const { path: activePath } = useActiveImage();
const route = useRoute();
const picker = useTemplateRef("picker");

async function onPick(event: Event) {
  const input = event.target as HTMLInputElement;
  const paths = await upload([...(input.files ?? [])]);

  input.value = "";

  if (paths.length > 0) {
    activePath.value = paths[0]!;
  }

  // Single shows the image right away.
  if (paths.length === 1 && route.path.startsWith("/edit/")) {
    await navigateTo(`/edit/${encodePath(paths[0]!)}`);
  }
}
</script>

<template>
  <input
    ref="picker"
    type="file"
    accept="image/*"
    multiple
    class="hidden"
    @change="onPick"
  />
  <AppButton
    :icon="icon"
    size="lg"
    :loading="uploading"
    @click="picker?.click()"
  >
    {{ label }}
  </AppButton>
</template>
