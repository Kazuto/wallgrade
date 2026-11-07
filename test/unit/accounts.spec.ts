import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACCOUNTS_FILE,
  createAccount,
  deleteAccount,
  listAccounts,
  sessionVersion,
  setPassword,
  signIn,
  type Users,
} from "../../server/utils/accounts";
import { tempDirectories } from "./helpers";

async function setUp(): Promise<Users> {
  const { source } = await tempDirectories();

  return {
    dir: source,
    admin: { username: "kazuto", password: "admin-secret" },
  };
}

describe("accounts", () => {
  it("signs the admin in with the configured password", async () => {
    const users = await setUp();

    expect(await signIn(users, " Kazuto", "admin-secret")).toEqual({
      account: { username: "kazuto", admin: true },
      version: expect.any(String),
    });
    expect(await signIn(users, "kazuto", "admin-secreT")).toBeNull();
  });

  it("adds users, who sign in with their password", async () => {
    const users = await setUp();

    await createAccount(users, "Alex", "correct horse");

    expect(await signIn(users, "alex", "correct horse")).toEqual({
      account: { username: "alex", admin: false },
      version: "1",
    });
    expect(await signIn(users, "alex", "correct hors")).toBeNull();
    expect(await signIn(users, "nobody", "correct horse")).toBeNull();
    expect((await stat(join(users.dir, "alex"))).isDirectory()).toBe(true);
    expect(
      await readFile(join(users.dir, ACCOUNTS_FILE), "utf8"),
    ).not.toContain("correct horse");
  });

  it("lists the admin first", async () => {
    const users = await setUp();

    await createAccount(users, "bea", "correct horse");
    await createAccount(users, "alex", "correct horse");

    expect(await listAccounts(users)).toEqual([
      { username: "kazuto", admin: true, createdAt: null },
      { username: "alex", admin: false, createdAt: expect.any(String) },
      { username: "bea", admin: false, createdAt: expect.any(String) },
    ]);
  });

  it.each([
    ["kazuto", "long enough", 409],
    ["ALEX", "long enough", 409],
    ["../evil", "long enough", 400],
    [".accounts.json", "long enough", 400],
    ["", "long enough", 400],
    ["bea", "short", 400],
  ])("refuses %j with %j", async (name, password, status) => {
    const users = await setUp();

    await createAccount(users, "alex", "correct horse");

    await expect(createAccount(users, name, password)).rejects.toMatchObject({
      statusCode: status,
    });
  });

  it("keeps additions made at the same time", async () => {
    const users = await setUp();

    await Promise.all(
      ["a1", "a2", "a3"].map((name) =>
        createAccount(users, name, "correct horse"),
      ),
    );

    expect((await listAccounts(users)).map((user) => user.username)).toEqual([
      "kazuto",
      "a1",
      "a2",
      "a3",
    ]);
  });

  it("ends sessions from before a new password", async () => {
    const users = await setUp();

    await createAccount(users, "alex", "correct horse");

    const before = await sessionVersion(users, "alex");
    const after = await setPassword(users, "alex", "battery staple");

    expect(after).not.toBe(before);
    expect(await sessionVersion(users, "alex")).toBe(after);
    expect(await signIn(users, "alex", "correct horse")).toBeNull();
    expect(await signIn(users, "alex", "battery staple")).not.toBeNull();
  });

  it("ends the admin's sessions when the configured password changes", async () => {
    const users = await setUp();
    const changed = { ...users, admin: { ...users.admin, password: "other" } };

    expect(await sessionVersion(changed, "kazuto")).not.toBe(
      await sessionVersion(users, "kazuto"),
    );
  });

  it("removes accounts but keeps their files", async () => {
    const users = await setUp();

    await createAccount(users, "alex", "correct horse");
    await deleteAccount(users, "alex");

    expect(await sessionVersion(users, "alex")).toBeNull();
    expect(await signIn(users, "alex", "correct horse")).toBeNull();
    expect((await stat(join(users.dir, "alex"))).isDirectory()).toBe(true);
    await expect(deleteAccount(users, "alex")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("leaves the admin to the configuration", async () => {
    const users = await setUp();

    await expect(deleteAccount(users, "kazuto")).rejects.toMatchObject({
      statusCode: 409,
    });
    await expect(
      setPassword(users, "kazuto", "new password"),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("reports a broken accounts file and leaves it untouched", async () => {
    const users = await setUp();
    const file = join(users.dir, ACCOUNTS_FILE);

    await mkdir(users.dir, { recursive: true });
    await writeFile(file, "{");

    await expect(signIn(users, "alex", "x")).rejects.toMatchObject({
      statusCode: 500,
    });
    await expect(
      createAccount(users, "alex", "correct horse"),
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(await readFile(file, "utf8")).toBe("{");
  });
});
