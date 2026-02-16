import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: 'dist',
  manifest: {
    icons: {
      16: "c-16.jpeg",
      32: "c-32.jpeg", 
      48: "c-48.jpeg",
      128: "c-128.jpeg",
    },
    permissions: ["notifications", "tabs", "storage", "webNavigation", "idle"],
    browser_specific_settings: {
      gecko: {
        "id": "coach@dimalip.in"
      }
    },
    content_security_policy: {
      extension_pages: "script-src 'self' http://localhost:3000 'unsafe-eval'; object-src 'self'"
    }
  },
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifestVersion: 2,
  webExt: {
    disabled: true
  },
  vite: () => ({})
});
