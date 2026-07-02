// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [react()],
  security: {
    // src/middleware.ts enforces host/origin checks across all API content types.
    checkOrigin: false,
    allowedDomains: [
      {
        hostname: '**.pony-puffin.ts.net',
        protocol: 'https'
      }
    ]
  },

  adapter: node({
    mode: 'standalone'
  }),

  vite: {
    plugins: [tailwindcss()]
  }
});
