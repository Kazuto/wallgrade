<script setup lang="ts">
defineProps<{ title: string; description: string }>();
</script>

<template>
  <section
    class="flex flex-col gap-6 rounded-2xl border border-line bg-panel/60 p-6"
  >
    <header class="flex flex-col gap-2">
      <h2 class="text-2xl font-semibold">{{ title }}</h2>
      <p class="text-muted">{{ description }}</p>
    </header>
    <slot />
  </section>
</template>
