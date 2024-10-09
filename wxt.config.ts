import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    icons: {
      16: "/icon16.jpeg",
      32: "/icon32.jpeg",
      48: "/icon48.jpeg",
      128: "/icon128.jpeg",
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
