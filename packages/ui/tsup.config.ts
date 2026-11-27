import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    external: ["react", "react-dom"],
    banner: {
      js: '"use client";',
    },
  },
  {
    entry: { utils: "src/lib/utils.ts" },
    format: ["esm"],
    dts: true,
  },
]);
