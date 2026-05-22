import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./packages/tests/setup.ts"],
    include: ["packages/tests/unit/**/*.{test,spec}.{ts,tsx}"],
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test?sslmode=disable",
      STRIPE_SEAT_PRICE_ID: "price_test_seat",
      STRIPE_SECRET_KEY: "sk_test_placeholder",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["lib/**/*.ts", "components/**/*.tsx", "app/**/*.{ts,tsx}"],
      exclude: [
        "lib/generated/**",
        "**/*.d.ts",
        "**/*.config.*",
        "node_modules/**",
      ],
      thresholds: {
        lines: 70,
      },
    },
  },
});
