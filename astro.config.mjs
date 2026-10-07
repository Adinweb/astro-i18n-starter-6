// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

const site = process.env.SITE_URL || 'https://example.com';

// https://astro.build/config
export default defineConfig({
  site,
  build: {
    format: 'directory',
  },
  trailingSlash: 'ignore',
  compressHTML: true,
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
