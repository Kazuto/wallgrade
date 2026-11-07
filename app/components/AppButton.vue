<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: ButtonVariants["variant"];
    size?: ButtonVariants["size"];
    /** Iconify name shown before the label, e.g. lucide:upload. */
    icon?: string;
    /** Shows a spinner instead of the icon and disables the button. */
    loading?: boolean;
    /** Renders a link to this route instead of a button. */
    to?: string;
  }>(),
  { variant: "secondary", size: "md", icon: undefined, to: undefined },
);

const NuxtLink = resolveComponent("NuxtLink");
</script>

<template>
  <component
    :is="props.to ? NuxtLink : 'button'"
    :to="props.to"
    :type="props.to ? undefined : 'button'"
    :disabled="props.to ? undefined : props.loading"
    :class="buttonClass({ variant: props.variant, size: props.size })"
  >
    <Icon
      v-if="props.loading"
      name="lucide:loader-circle"
      class="size-4 animate-spin"
    />
    <Icon v-else-if="props.icon" :name="props.icon" class="size-4" />
    <slot />
  </component>
</template>
