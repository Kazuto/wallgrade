<script setup lang="ts">
const FEATURED = [
  "catppuccin-mocha",
  "gruvbox-dark",
  "nord",
  "tokyo-night-dark",
  "rose-pine",
  "everforest-dark-medium",
];

const { resolved, setLut } = useScopedSettings();
const { colors, request } = usePaletteColors();

const names = ref<string[]>([]);
const query = ref("");

const lut = computed(() => resolved.value.lut);

// The chosen palette is always on show, in place of the last featured one.
const cards = computed(() =>
  FEATURED.includes(lut.value.palette)
    ? FEATURED
    : [lut.value.palette, ...FEATURED.slice(0, 5)],
);

const matches = computed(() => {
  const search = query.value.trim().toLowerCase();

  return search
    ? names.value.filter((name) => name.includes(search)).slice(0, 20)
    : [];
});

watchEffect(() => request([...cards.value, ...matches.value]));

onMounted(async () => {
  names.value = await $fetch<string[]>("/api/palettes").catch(() => []);
});

function choose(name: string) {
  setLut({ palette: name });
  query.value = "";
}
</script>

<template>
  <div class="flex flex-col gap-3" :class="{ 'opacity-50': !lut.enabled }">
    <div class="grid grid-cols-2 gap-2.5">
      <PaletteCard
        v-for="name in cards"
        :key="name"
        :name="name"
        :colors="colors[name]"
        :selected="lut.palette === name"
        @select="choose(name)"
      />
    </div>

    <div class="relative">
      <label class="sr-only" for="palette-search">Search palettes</label>
      <input
        id="palette-search"
        v-model="query"
        type="search"
        class="field"
        :placeholder="`Search ${names.length || ''} palettes`"
        autocomplete="off"
        @keydown.escape="query = ''"
      />
      <ul
        v-if="matches.length > 0"
        class="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-panel p-1 shadow-2xl"
      >
        <li v-for="name in matches" :key="name">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-raised"
            @click="choose(name)"
          >
            <span class="min-w-0 flex-1 truncate">{{
              paletteLabel(name)
            }}</span>
            <span
              class="flex h-2 w-24 shrink-0 overflow-hidden rounded-sm bg-raised"
            >
              <span
                v-for="(color, index) in colors[name] ?? []"
                :key="index"
                class="flex-1"
                :style="{ backgroundColor: color }"
              />
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
