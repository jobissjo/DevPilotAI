import { defineConfig, loadEnv } from "vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  plugins: [
    nitro({
      devProxy: {
        "/api/**": {
          target:
            loadEnv(mode, process.cwd(), "").API_PROXY_TARGET ||
            "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
}));

export default config;
