<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";

const { account, signOut } = useAccount();
const { notify } = useNotifications();
const route = useRoute();

const open = ref(false);
const menu = useTemplateRef("menu");

onClickOutside(menu, () => {
  open.value = false;
});

watch(
  () => route.path,
  () => {
    open.value = false;
  },
);

const itemClass = buttonClass({ variant: "ghost", class: "justify-start" });

async function leave() {
  await signOut().catch((error) => notify(errorMessage(error), "error"));
}
</script>

<template>
  <div v-if="account" ref="menu" class="relative">
    <button
      type="button"
      :class="buttonClass({ size: 'icon', class: 'size-11' })"
      :aria-expanded="open"
      :aria-label="`Account of ${account.username}`"
      :title="account.username"
      @click="open = !open"
    >
      <Icon name="lucide:user" class="size-4" />
    </button>
    <div
      v-if="open"
      class="absolute right-0 z-30 mt-2 flex w-56 flex-col gap-1 rounded-xl border border-line bg-panel p-2 shadow-2xl"
    >
      <p class="truncate px-4 py-2 text-sm text-muted">
        Signed in as
        <span class="font-medium text-fg">{{ account.username }}</span>
      </p>
      <NuxtLink v-if="account.admin" to="/users" :class="itemClass">
        <Icon name="lucide:users" class="size-4" />
        Users
      </NuxtLink>
      <NuxtLink to="/account" :class="itemClass">
        <Icon name="lucide:key-round" class="size-4" />
        Password
      </NuxtLink>
      <button type="button" :class="itemClass" @click="leave">
        <Icon name="lucide:log-out" class="size-4" />
        Sign out
      </button>
    </div>
  </div>
</template>
