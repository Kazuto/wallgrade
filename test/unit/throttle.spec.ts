import { describe, expect, it } from "vitest";
import { createThrottle } from "../../server/utils/throttle";

describe("createThrottle", () => {
  it("refuses a key after limit failures until the oldest leaves the window", () => {
    const throttle = createThrottle(3, 1000);

    for (const now of [0, 100, 200]) {
      expect(throttle.wait("alex", now)).toBe(0);
      throttle.fail("alex", now);
    }

    expect(throttle.wait("alex", 300)).toBe(700);
    expect(throttle.wait("bea", 300)).toBe(0);
    expect(throttle.wait("alex", 1001)).toBe(0);
  });

  it("forgets a key's failures after a success", () => {
    const throttle = createThrottle(3, 1000);

    for (const now of [0, 100, 200]) {
      throttle.fail("alex", now);
    }

    throttle.reset("alex");

    expect(throttle.wait("alex", 300)).toBe(0);
  });
});
