export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // Initialize WebSocket connection
  const serverUrl = import.meta.env.VITE_SERVER as string;
  const socket = new WebSocket(`${serverUrl}/connect`);

  socket.onopen = () => {
    console.log('connected');
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
  };

  // Add message listener
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'get_quote') {
      console.log("Got 'get_quote' message");
    }
  });
});
