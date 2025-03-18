import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: 'dist',
  manifest: {
    icons: {
      16: "/c-16.jpeg",
      32: "/c-32.jpeg",
      48: "/c-128.jpeg",
      128: "/c-128.jpeg",
    },
    permissions: ["notifications", "tabs", "storage", "webNavigation"],
    browser_specific_settings: {
      gecko: {
        "id": "coach@dimalip.in"
      }
    }
  },
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifestVersion: 2,
  runner: {
    disabled: true
  }
});
