// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://www.repowave.space",
  integrations: [],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: vercel(),
  output: 'server',
});