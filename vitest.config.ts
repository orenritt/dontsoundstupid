import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    testTimeout: 30_000,
    include: ["src/**/__tests__/**/*.test.ts"],
    exclude: [
      "node_modules",
      "src/lib/__tests__/pipeline-smoke.test.ts",
      "src/lib/__tests__/data-sources.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/safe-parse.ts",
        "src/lib/pipeline-status.ts",
        "src/lib/email-forward.ts",
        "src/lib/delivery.ts",
        "src/lib/newsletter-ingest.ts",
        "src/lib/news-ingestion/config.ts",
        "src/lib/news-ingestion/query-derivation.ts",
      ],
      reporter: ["text", "text-summary"],
    },
  },
});
