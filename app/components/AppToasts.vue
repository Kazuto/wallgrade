<script setup lang="ts">
const { notifications, dismiss } = useNotifications();
</script>

<template>
  <div
    class="fixed right-6 bottom-32 z-40 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2"
    role="status"
  >
    <TransitionGroup
      enter-from-class="translate-y-2 opacity-0"
      leave-to-class="opacity-0"
      enter-active-class="transition"
      leave-active-class="transition"
    >
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="flex items-start gap-3 rounded-xl border bg-panel px-4 py-3 text-sm shadow-2xl"
        :class="
          notification.kind === 'error' ? 'border-danger/40' : 'border-line'
        "
      >
        <Icon
          :name="
            notification.kind === 'error'
              ? 'lucide:circle-alert'
              : 'lucide:check'
          "
          class="mt-0.5 size-4 shrink-0"
          :class="
            notification.kind === 'error' ? 'text-danger' : 'text-success'
          "
        />
        <p class="flex-1 break-words">{{ notification.message }}</p>
        <button
          type="button"
          class="text-faint hover:text-fg"
          aria-label="Dismiss"
          @click="dismiss(notification.id)"
        >
          <Icon name="lucide:x" class="size-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
