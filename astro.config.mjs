// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Zero-cost static hosting (Cloudflare Pages / Netlify) — no server runtime.
  output: 'static',

  // Served from the domain root. All internal links use root-relative,
  // route-safe paths ("/", "/types", "/calc", "/rules").
  base: '/',
  trailingSlash: 'ignore',

  // After the first deploy, set this to the live URL so canonical/OG URLs and
  // any future sitemap resolve correctly, e.g.:
  //   site: 'https://pokemon-z-nuzlocke.pages.dev',

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  }
});
