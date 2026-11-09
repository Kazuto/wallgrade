import { z } from "zod";

const bodySchema = z.object({ password: z.string() });

/** Sets a new password for someone who forgot theirs, which ends their sessions. */
export default defineEventHandler(async (event) => {
  const users = requireAdmin(event);
  const { password } = await readValidatedBody(event, bodySchema.parse);

  await setPassword(
    users,
    getRouterParam(event, "username", { decode: true }) ?? "",
    password,
  );
});
