// What a session holds, see server/api/auth/login.post.ts.
declare module "#auth-utils" {
  interface User {
    username: string;
    admin: boolean;
  }

  interface UserSession {
    /** Must match the account's, see sessionVersion() in server/utils/accounts.ts. */
    version: string;
  }
}

export {};
