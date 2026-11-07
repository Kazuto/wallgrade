import type { Account } from "../shared/types/wallgrade";

declare module "h3" {
  interface H3EventContext {
    /** Who made the request, set by server/middleware/auth.ts when wallgrade has users. */
    account?: Account;
  }
}

export {};
