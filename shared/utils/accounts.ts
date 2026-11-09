import { z } from "zod";

/** Usernames double as folder names, so they are kept to safe characters. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9_-]{0,31}$/, {
    error:
      "Use up to 32 lowercase letters, digits, - and _, starting with a letter or digit",
  });

export const PASSWORD_MIN_LENGTH = 8;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, {
    error: `Use at least ${PASSWORD_MIN_LENGTH} characters`,
  })
  .max(256, { error: "Use at most 256 characters" });
