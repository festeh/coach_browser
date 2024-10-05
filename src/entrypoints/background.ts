export default defineBackground({
  persistent: true,
  main() {
    // Initialize WebSocket connection
    const serverUrl = import.meta.env.VITE_SERVER as string;
    const socket = new WebSocket(`${serverUrl}/connect`);

    console.log(Notification.permission);

    socket.onopen = () => {
      console.log('connected');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
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
        console.log("Got 'get_quote' message");
        socket.send(message.type)
      }
    });

    browser.webNavigation.onBeforeNavigate.addListener((details) => {
      console.log(details);
    })

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      console.log(tab);
    })
  }



});
