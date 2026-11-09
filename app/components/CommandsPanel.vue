<script setup lang="ts">
import { useClipboard } from "@vueuse/core";

const props = defineProps<{ commands: string[][] }>();

const lines = computed(() =>
  props.commands.map((command) => command.map(shellQuote).join(" ")),
);

const { copy, copied } = useClipboard({ legacy: true });
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-line bg-panel/60">
    <header
      class="flex items-center justify-between border-b border-line px-5 py-2.5"
    >
      <h3 class="eyebrow">Commands</h3>
      <AppButton size="sm" @click="copy(lines.join('\n'))">
        {{ copied ? "Copied" : "Copy" }}
      </AppButton>
    </header>
    <pre
      class="overflow-x-auto px-5 py-4 font-mono text-sm leading-7"
    ><code><span v-for="line in lines" :key="line" class="block"><span class="text-accent select-none">$ </span>{{ line }}</span></code></pre>
  </section>
</template>
