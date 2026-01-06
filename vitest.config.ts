import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "panhub",
    root: "./",
    include: [
      "test/unit/**/*.test.ts",
      "test/integration/**/*.test.ts",
      "server/**/__tests__/**/*.test.ts",
      "composables/**/__tests__/**/*.test.ts",
    ],
    environment: "node",
    globals: true,
    testTimeout: 60000, // 集成测试可能需要更长时间
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "test/",
        "**/*.d.ts",
        "**/config.ts",
        "**/index.ts",
        "**/__tests__/**",
      ],
    },
  },
  resolve: {
    alias: {
      "#internal": ".nuxt",
    },
  },
});
