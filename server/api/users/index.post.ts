import { z } from "zod";

const bodySchema = z.object({
  username: z.string(),
  password: z.string(),
});

export default defineEventHandler(async (event): Promise<UserSummary> => {
  const users = requireAdmin(event);
  const { username, password } = await readValidatedBody(
    event,
    bodySchema.parse,
  );

  return createAccount(users, username, password);
});
