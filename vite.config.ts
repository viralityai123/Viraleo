import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { existsSync } from "node:fs";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro({
      // The Docker build (deploy/Dockerfile) creates /app/.render-node so the
      // preset never depends on env propagation inside BuildKit.
      preset: existsSync("/app/.render-node")
        ? "node-server"
        : process.env.NITRO_PRESET || "vercel",
      serverDir: "server",
    }),
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
