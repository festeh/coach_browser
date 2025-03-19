import { blockPage } from "@/lib/blocking";

function connectWebSocket(serverUrl: string) {
  const socket = new WebSocket(`${serverUrl}/connect`);

  socket.onopen = () => {
    console.log('Connected to Coach server');
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    setTimeout(() => connectWebSocket(serverUrl), 5000);
  };

  socket.onclose = () => {
    console.log('Disconnected from Coach server');
    setTimeout(() => connectWebSocket(serverUrl), 5000);
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
    if (message.type === 'get_focus') {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message.type);
        console.log("Sent 'get_focus' message: " + message);
      } else {
        console.log("WebSocket not connected. Attempting to reconnect...");
        connectWebSocket(serverUrl);
        // Retry sending the message after a short delay
        setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(message.type);
            console.log("Sent 'get_focus' message after reconnection: " + message);
          } else {
            console.error("Failed to send 'get_focus' message: WebSocket still not connected");
          }
        }, 1000); // Wait for 1 second before retrying
      }
    }
  });
}

export default defineBackground({
  persistent: true,
  main() {
    // Initialize WebSocket connection
    const serverUrl = import.meta.env.VITE_SERVER as string;
    connectWebSocket(serverUrl);

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
