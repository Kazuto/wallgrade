import { defineVitestProject } from "@nuxt/test-utils/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // mountSuspended renders in <Suspense>, which Vue calls experimental once in
    // every file.
    onConsoleLog: (log) =>
      !log.startsWith("<Suspense> is an experimental feature"),
    projects: [
      // Plain Node tests for the shared and server code.
      {
        test: {
          name: "unit",
          include: ["test/unit/**/*.spec.ts"],
          environment: "node",
        },
      },
      // Tests that mount app code inside a running Nuxt app.
      await defineVitestProject({
        test: {
          name: "nuxt",
          include: ["test/nuxt/**/*.spec.ts"],
          environment: "nuxt",
          environmentOptions: {
            nuxt: {
              domEnvironment: "happy-dom",
              overrides: {
                // The app checks its build manifest a second after starting, with
                // $fetch; in a test file that ended by then, that throws and fails
                // the run.
                experimental: { appManifest: false },
              },
            },
          },
        },
      }),
    ],
  },
});
