// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://www.repowave.space",
  integrations: [
    sitemap({
      serialize(item) {
        if (item.url === "https://www.repowave.space" || item.url === "https://www.repowave.space/") {
          item.priority = 1.0;
          item.changefreq = "daily";
        } else if (item.url.includes("/repo/")) {
          item.priority = 0.7;
          item.changefreq = "daily";
        } else if (item.url.includes("/issue/")) {
          item.priority = 0.6;
          item.changefreq = "daily";
        } else if (item.url.includes("/about") || item.url.includes("/contact")) {
          item.priority = 0.1;
          item.changefreq = "monthly";
        } else {
          item.priority = 0.5;
          item.changefreq = "weekly";
        }
        item.lastmod = new Date().toISOString();
        return item;
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: vercel(),
  output: 'server',
});