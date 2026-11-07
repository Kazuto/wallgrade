import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Hash } from "@adonisjs/hash";
import { Scrypt } from "@adonisjs/hash/drivers/scrypt";
import { createError } from "h3";
import { z } from "zod";
import type { Account, UserSummary } from "../../shared/types/wallgrade";
import { passwordSchema, usernameSchema } from "../../shared/utils/accounts";
import { queueFor, writeJson } from "./jsonFiles";

/** The accounts besides the admin, next to their libraries. */
export const ACCOUNTS_FILE = ".accounts.json";

/** wallgrade with a sign-in and a library per user (NUXT_USERS_DIR). */
export interface Users {
  /** Holds every library, each in a folder named after its user. */
  dir: string;
  /** Configured by environment variables, so it is never stored. */
  admin: { username: string; password: string };
}

interface StoredAccount {
  passwordHash: string;
  createdAt: string;
  /** Raised with every new password, which ends the sessions from before. */
  sessionVersion: number;
}

const accountsSchema = z.record(
  z.string(),
  z.object({
    passwordHash: z.string(),
    createdAt: z.string(),
    sessionVersion: z.number().int(),
  }),
);

const hash = new Hash(new Scrypt({}));

// Hashed once per password, so the admin is checked the same way as everyone else.
const adminHashes = new Map<string, Promise<string>>();
let standIn: Promise<string> | undefined;

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

/** The value schema accepts, or a 400 with the first problem it found. */
function checked<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: result.error.issues[0]!.message,
    });
  }

  return result.data;
}

async function readAccounts(
  dir: string,
): Promise<Record<string, StoredAccount>> {
  const file = join(dir, ACCOUNTS_FILE);
  let text: string;

  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if (isNotFound(error)) {
      return {};
    }

    throw error;
  }

  let result;

  try {
    result = accountsSchema.safeParse(JSON.parse(text));
  } catch {
    result = null;
  }

  if (!result?.success) {
    throw createError({
      statusCode: 500,
      statusMessage: `${file} is not valid, fix or remove it`,
    });
  }

  return result.data;
}

/** Reads the accounts, lets change modify them and writes them back. */
function updateAccounts<T>(
  dir: string,
  change: (accounts: Record<string, StoredAccount>) => T,
): Promise<T> {
  const file = join(dir, ACCOUNTS_FILE);

  return queueFor(file, async () => {
    const accounts = await readAccounts(dir);
    const result = change(accounts);

    await writeJson(file, accounts);

    return result;
  });
}

function notFound(username: string) {
  return createError({
    statusCode: 404,
    statusMessage: `There is no user called ${username}`,
  });
}

function adminHash(users: Users): Promise<string> {
  const { password } = users.admin;
  let made = adminHashes.get(password);

  if (!made) {
    made = hash.make(password);
    adminHashes.set(password, made);
  }

  return made;
}

/** Changes with the admin's password, which ends the admin's sessions from before. */
function adminVersion(users: Users): string {
  return createHash("sha256")
    .update(users.admin.password)
    .digest("base64url")
    .slice(0, 16);
}

/** Every account, the admin first. */
export async function listAccounts(users: Users): Promise<UserSummary[]> {
  const accounts = await readAccounts(users.dir);

  return [
    { username: users.admin.username, admin: true, createdAt: null },
    ...Object.entries(accounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([username, account]) => ({
        username,
        admin: false,
        createdAt: account.createdAt,
      })),
  ];
}

/** Adds an account and its library folder. */
export async function createAccount(
  users: Users,
  username: string,
  password: string,
): Promise<UserSummary> {
  const name = checked(usernameSchema, username);
  const passwordHash = await hash.make(checked(passwordSchema, password));
  const createdAt = new Date().toISOString();

  await updateAccounts(users.dir, (accounts) => {
    if (name === users.admin.username || accounts[name]) {
      throw createError({
        statusCode: 409,
        statusMessage: `There is a user called ${name} already`,
      });
    }

    accounts[name] = { passwordHash, createdAt, sessionVersion: 1 };
  });

  await mkdir(join(users.dir, name), { recursive: true });

  return { username: name, admin: false, createdAt };
}

/** Removes an account; its library stays on disk. */
export async function deleteAccount(
  users: Users,
  username: string,
): Promise<void> {
  if (username === users.admin.username) {
    throw createError({
      statusCode: 409,
      statusMessage: "The admin is set by NUXT_ADMIN_USERNAME",
    });
  }

  await updateAccounts(users.dir, (accounts) => {
    if (!accounts[username]) {
      throw notFound(username);
    }

    Reflect.deleteProperty(accounts, username);
  });
}

/** Gives an account a new password and returns its new session version. */
export async function setPassword(
  users: Users,
  username: string,
  password: string,
): Promise<string> {
  if (username === users.admin.username) {
    throw createError({
      statusCode: 409,
      statusMessage: "The admin's password is set by NUXT_ADMIN_PASSWORD",
    });
  }

  const passwordHash = await hash.make(checked(passwordSchema, password));

  return updateAccounts(users.dir, (accounts) => {
    const account = accounts[username];

    if (!account) {
      throw notFound(username);
    }

    account.passwordHash = passwordHash;
    account.sessionVersion += 1;

    return String(account.sessionVersion);
  });
}

/** The account a username and password belong to and its session version, null when they don't match. */
export async function signIn(
  users: Users,
  username: string,
  password: string,
): Promise<{ account: Account; version: string } | null> {
  const name = username.trim().toLowerCase();

  if (name === users.admin.username) {
    return (await hash.verify(await adminHash(users), password))
      ? {
          account: { username: name, admin: true },
          version: adminVersion(users),
        }
      : null;
  }

  const stored = (await readAccounts(users.dir))[name];

  // Unknown names are checked against a stand-in, so they take as long as known ones.
  standIn ??= hash.make(randomUUID());

  const matches = await hash.verify(
    stored?.passwordHash ?? (await standIn),
    password,
  );

  return stored && matches
    ? {
        account: { username: name, admin: false },
        version: String(stored.sessionVersion),
      }
    : null;
}

/** The version a session needs to stay valid, null when its account is gone. */
export async function sessionVersion(
  users: Users,
  username: string,
): Promise<string | null> {
  if (username === users.admin.username) {
    return adminVersion(users);
  }

  const stored = (await readAccounts(users.dir))[username];

  return stored ? String(stored.sessionVersion) : null;
}
