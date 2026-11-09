export interface Notification {
  id: number;
  message: string;
  kind: "info" | "error";
}

let nextId = 1;

/** Short messages in the corner, e.g. a failed conversion. */
export function useNotifications() {
  const notifications = useState<Notification[]>("notifications", () => []);

  function dismiss(id: number) {
    notifications.value = notifications.value.filter(
      (notification) => notification.id !== id,
    );
  }

  function notify(message: string, kind: Notification["kind"] = "info") {
    const id = nextId++;

    notifications.value.push({ id, message, kind });
    // Errors stay longer, they are worth reading.
    setTimeout(() => dismiss(id), kind === "error" ? 10_000 : 4_000);
  }

  return { notifications, notify, dismiss };
}
