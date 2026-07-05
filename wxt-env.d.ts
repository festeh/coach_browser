/// <reference types="svelte" />

// Local build time, injected by Vite `define` in wxt.config.ts.
declare const __BUILD_DATE__: string;

// Absolute paths to the per-browser whitelist files, injected by Vite
// `define`. Chrome reads its source live through a symlink in dist.
declare const __WHITELIST_CHROME_SOURCE__: string;
declare const __WHITELIST_FIREFOX_SOURCE__: string;
