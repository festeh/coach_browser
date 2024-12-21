export default defineContentScript({
  matches: ['*://*.google.com/*'],
  main() {
    console.log('Hello from content script!');
  },
});
