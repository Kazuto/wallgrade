export type SettingsScope = "all" | "file";

/**
 * Settings as the panels edit them: the batch settings, or with the file scope,
 * the overrides of the active file.
 */
export function useScopedSettings() {
  const { settings, update } = useSettings();
  const { image } = useActiveImage();
  const { patchSoon } = useFiles();

  const scope = useState<SettingsScope>("settings-scope", () => "all");
  const fileScope = computed(() => scope.value === "file" && !!image.value);

  const resolved = computed(() =>
    fileScope.value
      ? resolveFile(settings.value!, image.value!.overrides)
      : { lut: settings.value!.lut, focus: settings.value!.focus },
  );

  const overridden = computed(() => ({
    lut: Object.keys(image.value?.overrides.lut ?? {}).length > 0,
    focus: image.value?.overrides.focus !== undefined,
  }));

  function setOverrides(overrides: FileOverrides) {
    patchSoon(image.value!.path, { overrides });
  }

  function setLut(change: Partial<LutSettings>) {
    if (fileScope.value) {
      const { overrides } = image.value!;

      setOverrides({ ...overrides, lut: { ...overrides.lut, ...change } });
    } else {
      update((draft) => Object.assign(draft.lut, change));
    }
  }

  function setFocus(focus: FocusMode) {
    if (fileScope.value) {
      setOverrides({ ...image.value!.overrides, focus });
    } else {
      update((draft) => {
        draft.focus = focus;
      });
    }
  }

  /** Drops the file's own LUT or focus mode, so it follows the batch again. */
  function reset(part: keyof FileOverrides) {
    setOverrides(
      Object.fromEntries(
        Object.entries(image.value!.overrides).filter(([key]) => key !== part),
      ),
    );
  }

  return { scope, fileScope, resolved, overridden, setLut, setFocus, reset };
}
