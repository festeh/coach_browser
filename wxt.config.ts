import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {

  },
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifestVersion: 2,
});
