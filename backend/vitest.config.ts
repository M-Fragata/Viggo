import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    globalSetup: "./src/test/globalSetup.ts",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/test/**",
        "src/@types/**",
        "src/diagramas/**",
        "src/server.ts",
      ],
      thresholds: {
        lines: 70,
        branches: 60,
        functions: 80,
      },
    },
  },
});
