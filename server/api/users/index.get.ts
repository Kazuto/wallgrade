export default defineEventHandler((event): Promise<UserSummary[]> =>
  listAccounts(requireAdmin(event)),
);
