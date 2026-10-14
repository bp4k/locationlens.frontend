import { defineConfig } from "vitest/config";
import { configDefaults } from "vitest/config";

export default defineConfig({
  // Vite loads the project's .env file (unsuffixed, so it applies to every
  // mode including "test") regardless of this test config. Point envDir at a
  // directory with no .env so a developer's local IDP/API config can never
  // leak into import.meta.env during tests - each test explicitly stubs
  // whatever env vars it needs via vi.stubEnv instead.
  envDir: "./tests",
  test: {
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    restoreMocks: true,
  },
});
