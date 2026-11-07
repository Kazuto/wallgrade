interface Job {
  path: string;
  /** Also redo outputs that are done. */
  force: boolean;
}

// The server converts two images at a time; asking for more only makes them wait there.
const WORKERS = 2;

/** Converts images one request each, so progress shows and single failures stay single. */
export function useConversion() {
  const queue = useState("conversion-queue", () => ({
    pending: [] as Job[],
    running: [] as string[],
    workers: 0,
    // Counted since the queue was last empty.
    total: 0,
    finished: 0,
  }));

  const { replace } = useLibrary();
  const { notify } = useNotifications();

  const busy = computed(() => queue.value.workers > 0);

  function isQueued(path: string) {
    return (
      queue.value.running.includes(path) ||
      queue.value.pending.some((job) => job.path === path)
    );
  }

  async function work() {
    queue.value.workers++;

    try {
      for (
        let job = queue.value.pending.shift();
        job;
        job = queue.value.pending.shift()
      ) {
        queue.value.running.push(job.path);

        try {
          replace(
            await $fetch<LibraryImage>("/api/convert", {
              method: "POST",
              body: job,
            }),
          );
        } catch (error) {
          notify(errorMessage(error), "error");
        } finally {
          queue.value.running = queue.value.running.filter(
            (path) => path !== job!.path,
          );
          queue.value.finished++;
        }
      }
    } finally {
      queue.value.workers--;
    }
  }

  function enqueue(paths: string[], force = false) {
    if (!busy.value) {
      queue.value.total = 0;
      queue.value.finished = 0;
    }

    const jobs = paths
      .filter((path) => !isQueued(path))
      .map((path) => ({ path, force }));

    queue.value.pending.push(...jobs);
    queue.value.total += jobs.length;

    while (
      queue.value.workers < Math.min(WORKERS, queue.value.pending.length)
    ) {
      work();
    }
  }

  /** Drops what has not started; running conversions finish. */
  function cancel() {
    queue.value.total -= queue.value.pending.length;
    queue.value.pending = [];
  }

  return { queue, busy, isQueued, enqueue, cancel };
}
