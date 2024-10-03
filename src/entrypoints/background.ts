export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // Initialize WebSocket connection
  const socket = new WebSocket('ws://localhost:8000/connect');

  socket.onopen = () => {
    console.log('connected');
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
  };
});
