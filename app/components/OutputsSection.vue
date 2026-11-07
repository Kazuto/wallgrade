<script setup lang="ts">
withDefaults(defineProps<{ monitors?: boolean }>(), { monitors: false });

const { settings, update } = useSettings();
const { fileScope } = useScopedSettings();

const name = ref("");
const size = ref("");
const error = ref<string | null>(null);
const monitorText = ref(settings.value!.monitors.join("\n"));

function toggle(index: number) {
  update((draft) => {
    draft.outputs[index]!.enabled = !draft.outputs[index]!.enabled;
  });
}

function remove(index: number) {
  update((draft) => {
    draft.outputs.splice(index, 1);
  });
}

function add() {
  const result = outputPresetSchema.safeParse({
    name: name.value,
    size: size.value.trim(),
    enabled: true,
  });

  if (!result.success) {
    error.value = result.error.issues[0]?.message ?? "Check the output";

    return;
  }

  if (
    settings.value!.outputs.some((output) => output.size === result.data.size)
  ) {
    error.value = `There already is an output of ${result.data.size}`;

    return;
  }

  update((draft) => {
    draft.outputs.push(result.data);
  });
  name.value = "";
  size.value = "";
  error.value = null;
}

function saveMonitors() {
  const lines = monitorText.value
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean);
  const invalid = lines.find((line) => !parseMonitor(line));

  if (invalid) {
    error.value = `${invalid} is no monitor, they look like 1440x2560+0+0`;

    return;
  }

  error.value = null;
  update((draft) => {
    draft.monitors = lines;
  });
}
</script>

<template>
  <div
    class="flex flex-col gap-2.5"
    :class="{ 'pointer-events-none opacity-50': fileScope }"
  >
    <div
      v-for="(output, index) in settings!.outputs"
      :key="output.size"
      class="group flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors"
      :class="
        output.enabled ? 'border-accent bg-accent/5' : 'border-line bg-panel'
      "
    >
      <input
        type="checkbox"
        :checked="output.enabled"
        :aria-label="`Render ${output.name}`"
        @change="toggle(index)"
      />
      <span class="min-w-0 flex-1 truncate text-sm">
        {{ output.name }} {{ aspectLabel(parseSize(output.size)!) }}
      </span>
      <span class="font-mono text-sm text-muted">{{
        output.size.replace("x", " × ")
      }}</span>
      <button
        type="button"
        class="text-faint opacity-0 group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
        :aria-label="`Remove ${output.name}`"
        @click="remove(index)"
      >
        <Icon name="lucide:x" class="size-4" />
      </button>
    </div>

    <form class="flex gap-2" @submit.prevent="add">
      <input
        v-model="name"
        class="field"
        placeholder="Name"
        aria-label="Output name"
      />
      <input
        v-model="size"
        class="field font-mono"
        placeholder="6320x2560"
        aria-label="Output size"
        spellcheck="false"
      />
      <AppButton
        type="submit"
        size="icon"
        icon="lucide:plus"
        aria-label="Add output"
        class="size-10"
      />
    </form>

    <details
      v-if="monitors"
      class="text-sm"
      :open="settings!.monitors.length > 0"
    >
      <summary class="cursor-pointer text-muted hover:text-fg">
        Monitor layout
      </summary>
      <div class="mt-2 flex flex-col gap-2">
        <textarea
          v-model="monitorText"
          rows="3"
          class="field h-auto py-2 font-mono"
          placeholder="1440x2560+0+0"
          spellcheck="false"
          @change="saveMonitors"
        />
        <p class="text-xs text-muted">
          WxH+X+Y per line. An output that spans all monitors shows where each
          one sits.
        </p>
      </div>
    </details>

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
    <p v-if="fileScope" class="text-xs text-muted">
      Outputs are the same for every file.
    </p>
  </div>
</template>
