import { useDebounceFn } from "@vueuse/core";

let saveSoon: (() => void) | undefined;

/** Pipeline settings and whether the tools it runs are installed. */
export function useSettings() {
  const settings = useState<Settings | null>("settings", () => null);
  const status = useState<Status | null>("status", () => null);
  const { notify } = useNotifications();

  async function load() {
    [settings.value, status.value] = await Promise.all([
      $fetch<Settings>("/api/settings"),
      $fetch<Status>("/api/status"),
    ]);
  }

  async function save() {
    try {
      // The answer is not applied, it could undo changes made while it was saved.
      await $fetch<Settings>("/api/settings", {
        method: "PUT",
        body: settings.value,
      });
    } catch (error) {
      notify(errorMessage(error), "error");
      await load();
    }

    // Statuses depend on the settings.
    await useLibrary().refresh();
  }

  // Shared by every caller; sliders change settings many times a second.
  saveSoon ??= useDebounceFn(save, 500);

  /** Changes the settings right away and saves them once changes pause. */
  function update(change: (draft: Settings) => void) {
    if (settings.value) {
      change(settings.value);
      saveSoon!();
    }
  }

  return { settings, status, load, update };
}
