<script setup lang="ts">
const { resolved, fileScope, overridden, reset } = useScopedSettings();

const tuning = ref(false);
</script>

<template>
  <div
    class="flex flex-col gap-6 rounded-2xl border border-line bg-panel/60 p-5"
  >
    <ScopeToggle />

    <section class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-muted">1 · Palette</h3>
        <button
          v-if="fileScope && overridden.lut"
          type="button"
          class="text-xs text-accent hover:underline"
          @click="reset('lut')"
        >
          Use batch palette
        </button>
      </div>
      <PaletteSection />
      <div
        class="flex items-center gap-3 rounded-lg border border-line bg-canvas px-3 py-2.5 font-mono text-xs text-muted"
      >
        <span class="min-w-0 flex-1 truncate">
          {{
            resolved.lut.enabled ? lutSummary(resolved.lut) : "Original colors"
          }}
        </span>
        <button
          type="button"
          class="font-sans text-sm text-accent underline-offset-2 hover:underline"
          :aria-expanded="tuning"
          @click="tuning = !tuning"
        >
          {{ tuning ? "Done" : "Tune" }}
        </button>
      </div>
      <LutTune v-if="tuning" class="rounded-xl border border-line p-4" />
    </section>

    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold text-muted">2 · Outputs per file</h3>
      <OutputsSection monitors />
    </section>

    <section class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-muted">3 · Focus</h3>
        <button
          v-if="fileScope && overridden.focus"
          type="button"
          class="text-xs text-accent hover:underline"
          @click="reset('focus')"
        >
          Use batch focus
        </button>
      </div>
      <FocusSection />
    </section>

    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold text-muted">4 · Format</h3>
      <FormatSection />
    </section>
  </div>
</template>
