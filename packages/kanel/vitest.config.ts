import { configDefaults, defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    globalSetup: "src/test-helpers/globalSetup.ts",
    sequence: { hooks: "stack" },
    deps: {
      interopDefault: true,
    },
    pool: "vmThreads",
  },
});
