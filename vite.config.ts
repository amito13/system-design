/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { buildThemeBootScript } from './src/app/theme/boot.ts';

/** Injects the no-flash theme/lang/motion boot script into <head> (PRD §4.4). */
function themeBoot(): Plugin {
  return {
    name: 'scalecanvas-theme-boot',
    transformIndexHtml(html) {
      if (!html.includes('<!--theme-boot-->'))
        throw new Error('index.html is missing <!--theme-boot-->');
      return html.replace('<!--theme-boot-->', `<script>${buildThemeBootScript()}</script>`);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), themeBoot()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
