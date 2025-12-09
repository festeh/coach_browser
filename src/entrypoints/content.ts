export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'BLOCKED_ALERT') {
        alert('This site is blocked during focus mode!');
      }
    });
  },
});
