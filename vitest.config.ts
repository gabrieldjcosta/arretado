import { defineConfig, mergeConfig } from "vitest/config";
import configVite from "./vite.config.ts";

export default defineConfig((ambiente) =>
  mergeConfig(
    configVite(ambiente),
    defineConfig({
      test: {
        environment: "jsdom",
        setupFiles: ["./tests/setup.ts"],
        include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
      },
    }),
  ),
);
