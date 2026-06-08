// @ts-check
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://viem0s.github.io",
  base: "/Culturecase-site",
  integrations: [react(), sitemap()],
  output: "static",
});
