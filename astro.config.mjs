import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.nolanchai.dev',
  base: '/fortune-weave',
  output: 'static',
  trailingSlash: 'always',
});
