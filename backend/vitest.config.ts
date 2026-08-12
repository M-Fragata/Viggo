import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/integration/**", "node_modules", "dist"],
          setupFiles: ["./src/test/setup.ts"],
          globalSetup: "./src/test/globalSetup.ts",
        },
      },
      {
        test: {
          name: "integration",
          include: ["src/**/integration/**/*.test.ts"],
          exclude: ["node_modules", "dist"],
          setupFiles: ["./src/test/integration/setup.ts"],
          globalSetup: "./src/test/globalSetup.ts",
        },
      },
    ],
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
