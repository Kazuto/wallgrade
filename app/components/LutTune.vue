<script setup lang="ts">
const { resolved, setLut } = useScopedSettings();

const lut = computed(() => resolved.value.lut);

/** A two-way binding for one LUT setting, for v-model. */
function field<K extends keyof LutSettings>(key: K) {
  return computed({
    get: () => lut.value[key],
    set: (value: LutSettings[K]) => setLut({ [key]: value }),
  });
}

const enabled = field("enabled");
const algorithm = field("algorithm");
const radius = field("radius");
const shape = field("shape");
const power = field("power");
const nearest = field("nearest");
const luminosity = field("luminosity");
const level = field("level");
const preserve = field("preserve");
</script>

<template>
  <div class="flex flex-col gap-5">
    <label class="flex items-center gap-3 text-sm">
      <input v-model="enabled" type="checkbox" />
      Recolor with the palette
    </label>

    <div
      class="flex flex-col gap-5"
      :class="{ 'pointer-events-none opacity-50': !lut.enabled }"
    >
      <label class="flex flex-col gap-2 text-sm">
        Algorithm
        <select v-model="algorithm" class="field">
          <option
            v-for="option in LUT_ALGORITHMS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>

      <RangeField
        v-if="lut.algorithm === 'gaussian-blur'"
        v-model="radius"
        label="Blur radius"
        :min="1"
        :max="32"
        :step="0.5"
        :digits="1"
      />
      <RangeField
        v-if="lut.algorithm === 'gaussian-rbf'"
        v-model="shape"
        label="Shape"
        :min="1"
        :max="512"
      />
      <RangeField
        v-if="lut.algorithm === 'shepards-method'"
        v-model="power"
        label="Power"
        :min="1"
        :max="16"
        :step="0.5"
        :digits="1"
      />
      <RangeField
        v-if="
          lut.algorithm === 'gaussian-rbf' ||
          lut.algorithm === 'shepards-method'
        "
        v-model="nearest"
        label="Nearest colors"
        :min="0"
        :max="64"
      />
      <RangeField
        v-model="luminosity"
        label="Luminosity factor"
        :min="0.05"
        :max="2"
        :step="0.05"
        :digits="2"
      />
      <RangeField v-model="level" label="Hald level" :min="2" :max="16" />

      <label class="flex items-center gap-3 text-sm">
        <input v-model="preserve" type="checkbox" />
        Preserve original luminosity
      </label>
    </div>
  </div>
</template>
