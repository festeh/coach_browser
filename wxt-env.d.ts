/// <reference types="svelte" />

// Local build time, injected by Vite `define` in wxt.config.ts.
declare const __BUILD_DATE__: string;

// Absolute paths to the whitelist file, injected by Vite `define`:
// the editable source in the repo, and the live copy Chrome reads.
declare const __WHITELIST_SOURCE_PATH__: string;
declare const __WHITELIST_CHROME_PATH__: string;
