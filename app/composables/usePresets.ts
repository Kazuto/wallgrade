/** Batch settings saved under a name. */
export function usePresets() {
  const presets = useState<Record<string, Settings>>("presets", () => ({}));
  const { update } = useSettings();
  const { notify } = useNotifications();

  async function load() {
    presets.value = await $fetch<Record<string, Settings>>("/api/presets");
  }

  async function save(name: string) {
    presets.value = await $fetch<Record<string, Settings>>("/api/presets", {
      method: "PUT",
      body: { name },
    });
    notify(`Saved preset ${name}`);
  }

  async function remove(name: string) {
    presets.value = await $fetch<Record<string, Settings>>(
      `/api/presets/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );
  }

  function apply(name: string) {
    const preset = presets.value[name];

    if (preset) {
      update((draft) => Object.assign(draft, structuredClone(preset)));
      notify(`Applied preset ${name}`);
    }
  }

  return { presets, load, save, remove, apply };
}
