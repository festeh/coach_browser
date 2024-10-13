import { blockPage } from "@/lib/blocking";

export default defineBackground({
  persistent: true,
  main() {
    // Initialize WebSocket connection
    const serverUrl = import.meta.env.VITE_SERVER as string;
    browser.storage.local.set({ connected: false }).then(() => {
      const socket = new WebSocket(`${serverUrl}/connect`);
      socket.onopen = () => {
        browser.storage.local.set({ connected: true }).then(() => {
          console.log('connected to server');
        });
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      socket.onclose = () => {
        browser.storage.local.set({ connected: false }).then(() => {
          console.log('disconnected from server');
        })
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log(message);
        if (message.event === 'quote') {
          browser.notifications.create({
            type: 'basic',
            iconUrl: browser.runtime.getURL('/icon128.jpeg'),
            title: 'Hey, You',
            message: message.quote
          });
        }
        if (message.event === 'focus') {
          const focus = message.focus;
          browser.storage.local.set({ focus: focus }).then(() => {
            console.log('Focus saved to storage:', focus);
          }).catch((error) => {
            console.error('Error saving focus to storage:', error);
          });
        }
      };

      // Add message listener
      browser.runtime.onMessage.addListener((message) => {
        if (message.type === 'get_quote') {
          socket.send(message.type)
          console.log("Sent 'get_quote' message: " + message);
        }
      });

    })

    browser.webNavigation.onBeforeNavigate.addListener((details) => {
      const { tabId, url, frameId } = details;
      if (!url || !url.startsWith("http") || frameId !== 0) {
        return;
      }
      blockPage({ url, tabId });
    })

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (!tabId) {
        return;
      }

      const { url } = changeInfo;
      if (!url || !url.startsWith("http")) {
        return;
      }
      blockPage({ url, tabId });
    })
  }



});
