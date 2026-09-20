import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { tanstackRouterGenerator } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
    watch: {
      ignored: ['**/src/routeTree.gen.ts'],
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    tanstackRouterGenerator({
      target: 'react',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
  ],
});
