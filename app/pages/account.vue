<script setup lang="ts">
const { account } = useAccount();
const { notify } = useNotifications();

const current = ref("");
const password = ref("");
const repeat = ref("");
const error = ref<string | null>(null);
const busy = ref(false);

async function submit() {
  error.value =
    password.value.length < PASSWORD_MIN_LENGTH
      ? `Use at least ${PASSWORD_MIN_LENGTH} characters`
      : password.value !== repeat.value
        ? "The new passwords differ"
        : null;

  if (error.value) {
    return;
  }

  busy.value = true;

  try {
    await $fetch("/api/auth/password", {
      method: "PUT",
      body: { current: current.value, password: password.value },
    });
    notify("Password changed, other sessions are signed out");
    current.value = password.value = repeat.value = "";
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppHeader :modes="false">
      <template #title>
        <h1 class="text-lg font-semibold">Password</h1>
      </template>
      <template #actions>
        <AppButton to="/" icon="lucide:arrow-left">Back to Batch</AppButton>
      </template>
    </AppHeader>

    <main class="mx-auto w-full max-w-md p-6">
      <p
        v-if="account?.admin"
        class="rounded-2xl border border-line bg-panel p-6 text-sm text-muted"
      >
        You are the admin, whose password is set by NUXT_ADMIN_PASSWORD on the
        server. Changing it there signs you out everywhere.
      </p>

      <form
        v-else
        class="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-6"
        @submit.prevent="submit"
      >
        <input
          :value="account?.username"
          autocomplete="username"
          class="hidden"
          readonly
        />
        <label class="flex flex-col gap-1.5 text-sm">
          <span class="text-muted">Current password</span>
          <input
            v-model="current"
            type="password"
            class="field"
            autocomplete="current-password"
            required
          />
        </label>
        <label class="flex flex-col gap-1.5 text-sm">
          <span class="text-muted">New password</span>
          <input
            v-model="password"
            type="password"
            class="field"
            autocomplete="new-password"
            required
          />
        </label>
        <label class="flex flex-col gap-1.5 text-sm">
          <span class="text-muted">New password again</span>
          <input
            v-model="repeat"
            type="password"
            class="field"
            autocomplete="new-password"
            required
          />
        </label>
        <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
        <p class="text-xs text-muted">Signs you out on every other device.</p>
        <AppButton type="submit" variant="primary" :loading="busy"
          >Change password</AppButton
        >
      </form>
    </main>
  </div>
</template>
