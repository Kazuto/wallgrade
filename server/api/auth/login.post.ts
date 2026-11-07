import { z } from "zod";

const bodySchema = z.object({
  username: z.string().max(64),
  password: z.string().max(256),
});

export default defineEventHandler(async (event): Promise<Account> => {
  const users = requireUsers();
  const { username, password } = await readValidatedBody(
    event,
    bodySchema.parse,
  );
  const key = username.trim().toLowerCase();

  checkThrottle(event, key);

  const match = await signIn(users, username, password);

  if (!match) {
    passwordThrottle.fail(key);

    throw createError({
      statusCode: 401,
      statusMessage: "Wrong username or password",
    });
  }

  passwordThrottle.reset(key);
  await replaceUserSession(event, {
    user: match.account,
    version: match.version,
  });

  return match.account;
});
