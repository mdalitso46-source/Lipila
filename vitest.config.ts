import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      DEMO_MODE: "true",
      WALLET_ENCRYPTION_KEY: "ab".repeat(32),
      SESSION_SECRET: "test-session-secret-not-for-production",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
