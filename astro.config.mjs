// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://inmotus.mx',
  base: '/',
  integrations: [react(), tailwind()],
  vite: {
    ssr: {
      external: ['node:crypto'],
    },
  },
});