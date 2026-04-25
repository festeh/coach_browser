import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: 'dist',
  manifest: {
    icons: {
      16: "active-16.png",
      32: "active-32.png",
      48: "active-48.png",
      128: "active-128.png",
    },
    permissions: ["notifications", "tabs", "storage", "webNavigation", "idle", "alarms"],
    browser_specific_settings: {
      gecko: {
        "id": "coach@dimalip.in"
      }
    }
  },
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifestVersion: 3,
  webExt: {
    disabled: true
  },
  vite: () => ({})
});
