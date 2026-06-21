import { defineConfig } from 'wxt';

// Stamp the bundle with its build time so a loaded extension can show how
// fresh it is. Computed once here (config eval = build start) and in the
// builder's local time, so every entrypoint shares the same value.
const buildDate = (() => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
})();

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
    permissions: ["tabs", "storage", "webNavigation", "alarms", "idle"],
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
  // Private extension: readable bundles beat small ones (debugging in DevTools).
  vite: () => ({
    build: {
      minify: false
    },
    define: {
      __BUILD_DATE__: JSON.stringify(buildDate)
    }
  })
});
