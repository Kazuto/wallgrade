/** Whether wallgrade has users, and who is signed in. */
export default defineEventHandler(async (event): Promise<SessionInfo> => {
  const users = useUsers();

  return {
    users: users !== null,
    account: users ? await currentAccount(event, users) : null,
  };
});
