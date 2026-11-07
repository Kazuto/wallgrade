<script setup lang="ts">
const { signIn } = useAccount();

const username = ref("");
const password = ref("");
const error = ref<string | null>(null);
const busy = ref(false);

async function submit() {
  busy.value = true;
  error.value = null;

  try {
    await signIn(username.value, password.value);
  } catch (caught) {
    error.value = errorMessage(caught);
    password.value = "";
    busy.value = false;
  }
}
</script>

<template>
  <main class="flex flex-1 items-center justify-center p-6">
    <form
      class="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-line bg-panel p-8 shadow-2xl"
      @submit.prevent="submit"
    >
      <h1 class="flex items-center gap-2.5 text-lg font-bold">
        <Icon name="lucide:image" class="size-6 text-accent" />
        wallgrade
      </h1>
      <label class="flex flex-col gap-1.5 text-sm">
        <span class="text-muted">Username</span>
        <input
          v-model="username"
          class="field"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          required
          autofocus
        />
      </label>
      <label class="flex flex-col gap-1.5 text-sm">
        <span class="text-muted">Password</span>
        <input
          v-model="password"
          type="password"
          class="field"
          autocomplete="current-password"
          required
        />
      </label>
      <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
      <AppButton type="submit" variant="primary" size="lg" :loading="busy"
        >Sign in</AppButton
      >
    </form>
  </main>
</template>
