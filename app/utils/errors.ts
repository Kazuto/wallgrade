/** The message to show for a failed $fetch, preferring what the server said. */
export function errorMessage(error: unknown): string {
  const data = (
    error as { data?: { statusMessage?: string; message?: string } }
  ).data;

  return (
    data?.statusMessage ??
    data?.message ??
    (error as Error).message ??
    "Something went wrong"
  );
}
