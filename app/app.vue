<script setup lang="ts">
const { load } = useSettings();
const { refresh } = useLibrary();
const { notify } = useNotifications();
const { needsSignIn } = useAccount();

onMounted(async () => {
  // Signing in starts the app over, which loads the library then.
  if (needsSignIn.value) {
    return;
  }

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
  <DropOverlay v-if="!needsSignIn" />
  <AppToasts />
</template>
