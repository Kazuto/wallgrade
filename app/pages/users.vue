<script setup lang="ts">
const { notify } = useNotifications();

const users = ref<UserSummary[] | null>(null);

onMounted(async () => {
  try {
    users.value = await $fetch<UserSummary[]>("/api/users");
  } catch (error) {
    notify(errorMessage(error), "error");
  }
});

const username = ref("");
const password = ref("");
const adding = ref(false);
const addError = ref<string | null>(null);

async function add() {
  const name = usernameSchema.safeParse(username.value);

  addError.value = !name.success
    ? name.error.issues[0]!.message
    : password.value.length < PASSWORD_MIN_LENGTH
      ? `Use a password of at least ${PASSWORD_MIN_LENGTH} characters`
      : null;

  if (addError.value) {
    return;
  }

  adding.value = true;

  try {
    const created = await $fetch<UserSummary>("/api/users", {
      method: "POST",
      body: { username: username.value, password: password.value },
    });

    users.value = [...(users.value ?? []), created];
    notify(`Added ${created.username}`);
    username.value = password.value = "";
  } catch (error) {
    addError.value = errorMessage(error);
  } finally {
    adding.value = false;
  }
}

// The user whose password is being reset.
const resetting = ref<string | null>(null);
const newPassword = ref("");

async function reset(name: string) {
  try {
    await $fetch(`/api/users/${encodeURIComponent(name)}/password`, {
      method: "PUT",
      body: { password: newPassword.value },
    });
    notify(`Changed the password of ${name}, who is signed out everywhere`);
    resetting.value = null;
    newPassword.value = "";
  } catch (error) {
    notify(errorMessage(error), "error");
  }
}

async function remove(name: string) {
  if (
    !confirm(
      `Remove ${name}? They can't sign in anymore. Their files stay on the server, in their folder.`,
    )
  ) {
    return;
  }

  try {
    await $fetch(`/api/users/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    users.value = (users.value ?? []).filter((user) => user.username !== name);
    notify(`Removed ${name}`);
  } catch (error) {
    notify(errorMessage(error), "error");
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppHeader :modes="false">
      <template #title>
        <h1 class="text-lg font-semibold">Users</h1>
      </template>
      <template #actions>
        <AppButton to="/" icon="lucide:arrow-left">Back to Batch</AppButton>
      </template>
    </AppHeader>

    <main class="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <form
        class="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-6"
        @submit.prevent="add"
      >
        <h2 class="eyebrow">Add a user</h2>
        <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            v-model="username"
            class="field"
            placeholder="Username"
            aria-label="Username"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
          />
          <input
            v-model="password"
            type="password"
            class="field"
            placeholder="Password"
            aria-label="Password"
            autocomplete="new-password"
          />
          <AppButton
            type="submit"
            variant="primary"
            icon="lucide:user-plus"
            :loading="adding"
            >Add</AppButton
          >
        </div>
        <p v-if="addError" class="text-sm text-danger" role="alert">
          {{ addError }}
        </p>
        <p class="text-xs text-muted">
          Each user gets their own library and can change the password after
          signing in.
        </p>
      </form>

      <div
        v-if="!users"
        class="flex items-center justify-center p-12 text-muted"
      >
        <Icon name="lucide:loader-circle" class="size-6 animate-spin" />
      </div>

      <ul
        v-else
        class="divide-y divide-line rounded-2xl border border-line bg-panel"
      >
        <li
          v-for="user in users"
          :key="user.username"
          class="flex flex-wrap items-center gap-3 px-6 py-4"
        >
          <Icon name="lucide:user" class="size-4 text-muted" />
          <span class="font-medium">{{ user.username }}</span>
          <span
            v-if="user.admin"
            class="rounded-md border border-line px-2 py-0.5 text-xs text-muted"
            >Admin</span
          >
          <span v-if="user.createdAt" class="text-sm text-faint">
            added {{ new Date(user.createdAt).toLocaleDateString() }}
          </span>

          <div v-if="!user.admin" class="ml-auto flex gap-2">
            <AppButton
              variant="ghost"
              size="sm"
              icon="lucide:key-round"
              @click="
                resetting = resetting === user.username ? null : user.username
              "
              >Reset password</AppButton
            >
            <AppButton
              variant="ghost"
              size="icon"
              icon="lucide:trash-2"
              :aria-label="`Remove ${user.username}`"
              :title="`Remove ${user.username}`"
              @click="remove(user.username)"
            />
          </div>

          <form
            v-if="resetting === user.username"
            class="flex w-full gap-2"
            @submit.prevent="reset(user.username)"
          >
            <input
              v-model="newPassword"
              type="password"
              class="field"
              :placeholder="`New password for ${user.username}`"
              :aria-label="`New password for ${user.username}`"
              autocomplete="new-password"
            />
            <AppButton type="submit" variant="primary">Save</AppButton>
          </form>
        </li>
      </ul>
    </main>
  </div>
</template>
