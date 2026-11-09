import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// Changes to the same file wait for each other, so no change gets lost.
const queues = new Map<string, Promise<unknown>>();

/** Runs task once every earlier task for the same file is done, failed or not. */
export function queueFor<T>(file: string, task: () => Promise<T>): Promise<T> {
  const next = (queues.get(file) ?? Promise.resolve())
    .catch(() => {})
    .then(task);

  queues.set(file, next);

  return next;
}

/** Writes JSON next to the file and renames it, so readers never see half of it. */
export async function writeJson(file: string, data: unknown): Promise<void> {
  const part = `${file}.part`;

  await mkdir(dirname(file), { recursive: true });
  await writeFile(part, `${JSON.stringify(data, null, 2)}\n`);
  await rename(part, file);
}
