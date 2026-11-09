import { z } from "zod";

const bodySchema = z.object({
  current: z.string().max(256),
  password: z.string(),
});

/** Changes the signed-in user's password, which ends their other sessions. */
export default defineEventHandler(async (event) => {
  const users = requireUsers();
  const account = event.context.account!;
  const { current, password } = await readValidatedBody(
    event,
    bodySchema.parse,
  );

  // A session left open somewhere must not be enough to take the account over.
  checkThrottle(event, account.username);

  if (!(await signIn(users, account.username, current))) {
    passwordThrottle.fail(account.username);

    throw createError({
      statusCode: 403,
      statusMessage: "The current password is wrong",
    });
  }

  const version = await setPassword(users, account.username, password);

  await replaceUserSession(event, { user: account, version });
});
