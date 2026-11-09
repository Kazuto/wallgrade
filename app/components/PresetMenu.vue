<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";

const { presets, load, save, remove, apply } = usePresets();
const { notify } = useNotifications();

const open = ref(false);
const name = ref("");
const menu = useTemplateRef("menu");

onClickOutside(menu, () => {
  open.value = false;
});

watch(open, async (isOpen) => {
  if (isOpen) {
    await load().catch((error) => notify(errorMessage(error), "error"));
  }
});

async function submit() {
  if (name.value.trim()) {
    await save(name.value.trim()).catch((error) =>
      notify(errorMessage(error), "error"),
    );
    name.value = "";
  }
}
</script>

<template>
  <div ref="menu" class="relative">
    <AppButton size="lg" :aria-expanded="open" @click="open = !open"
      >Save preset</AppButton
    >
    <div
      v-if="open"
      class="absolute right-0 z-30 mt-2 flex w-80 flex-col gap-3 rounded-xl border border-line bg-panel p-4 shadow-2xl"
    >
      <form class="flex gap-2" @submit.prevent="submit">
        <input
          v-model="name"
          class="field"
          placeholder="Preset name"
          aria-label="Preset name"
        />
        <AppButton type="submit" variant="primary">Save</AppButton>
      </form>
      <p class="text-xs text-muted">
        Saves the batch settings; a preset of the same name is replaced.
      </p>
      <ul
        v-if="Object.keys(presets).length > 0"
        class="flex flex-col gap-1 border-t border-line pt-3"
      >
        <li
          v-for="(preset, presetName) in presets"
          :key="presetName"
          class="flex items-center gap-2"
        >
          <span class="min-w-0 flex-1 truncate text-sm" :title="presetName">{{
            presetName
          }}</span>
          <AppButton variant="ghost" size="sm" @click="apply(presetName)"
            >Apply</AppButton
          >
          <AppButton
            variant="ghost"
            size="icon"
            icon="lucide:trash-2"
            :aria-label="`Delete ${presetName}`"
            @click="remove(presetName)"
          />
        </li>
      </ul>
    </div>
  </div>
</template>
