<script setup lang="ts">
const { load } = useSettings();
const { refresh } = useLibrary();
const { notify } = useNotifications();

onMounted(async () => {
  try {
    await Promise.all([load(), refresh()]);
  } catch (error) {
    notify(errorMessage(error), "error");
  }
});
</script>

<template>
  <NuxtRouteAnnouncer />
  <div class="flex min-h-dvh flex-col">
    <NuxtPage />
  </div>
  <DropOverlay />
  <AppToasts />
</template>
