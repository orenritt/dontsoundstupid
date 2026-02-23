import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    testTimeout: 300_000,
    include: [
      "src/lib/__tests__/pipeline-smoke.test.ts",
      "src/lib/__tests__/pipeline-live-compose.test.ts",
    ],
  },
});
