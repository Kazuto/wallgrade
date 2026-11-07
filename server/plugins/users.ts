import {
  PASSWORD_MIN_LENGTH,
  usernameSchema,
} from "../../shared/utils/accounts";

/** Refuses to start with users but without a usable admin or session secret. */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();

  if (!config.usersDir) {
    return;
  }

  const admin = config.adminUsername.trim().toLowerCase();
  const problems: string[] = [];

  if (usernameSchema.safeParse(admin).data !== admin) {
    problems.push(
      "NUXT_ADMIN_USERNAME may hold up to 32 letters, digits, - and _, starting with a letter or digit",
    );
  }

  if (config.adminPassword.length < PASSWORD_MIN_LENGTH) {
    problems.push(
      `NUXT_ADMIN_PASSWORD needs at least ${PASSWORD_MIN_LENGTH} characters`,
    );
  }

  if ((config.session.password ?? "").length < 32) {
    problems.push(
      "NUXT_SESSION_PASSWORD needs at least 32 characters, e.g. from `openssl rand -base64 32`",
    );
  }

  if (problems.length > 0) {
    throw new Error(
      `wallgrade can't start with NUXT_USERS_DIR set:\n- ${problems.join("\n- ")}`,
    );
  }

  console.info(`wallgrade: one library per user in ${config.usersDir}`);
});
