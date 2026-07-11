import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["app/game/**/*.test.ts"],
    coverage: {
      include: ["app/game/puzzle.ts", "app/game/save.ts"],
    },
  },
});

