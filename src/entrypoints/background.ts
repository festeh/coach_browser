import { blockPage } from "@/lib/blocking";

let socket: WebSocket | null = null;

function connectWebSocket(serverUrl: string) {
  socket = new WebSocket(`${serverUrl}/connect`);
  setupSocketListeners();
};

interface Message {
  type: string;
}

function requestQuoteFromSocket(message: Message) {
  if (socket === null) {
    console.log('No WebSocket connection');
    return;
  }
  socket.send(message.type)
  console.log("Sent 'get_quote' message: " + message);
}

function getFocusStateFromSocket(message: Message) {
  if (socket === null) {
    console.log('No WebSocket connection');
    return;
  }
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(message.type);
    console.log("Sent 'get_focus' message: " + message);
  } else {
    console.log("WebSocket not connected. Attempting to reconnect...");
  }
}

function reconnectWebSocket() {
  if (socket) {
    socket.close();
  }
  const serverUrl = import.meta.env.VITE_SERVER as string;
  console.log("Attempting to reconnect to WebSocket server...");
  connectWebSocket(serverUrl);
}

function setupConnectionHealthCheck() {
  setTimeout(() => {
    setInterval(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.log("Socket connection check failed, attempting to reconnect...");
        reconnectWebSocket();
      } else {
        console.log("Socket connection check passed");
      }
    }, 60000); // Check every 60 seconds
  }, 60000); // Start checking after 60 seconds
}

function setupBackgroundScriptListeners() {
  browser.runtime.onMessage.addListener((message: Message) => {
    if (message.type === 'get_quote') {
      requestQuoteFromSocket(message)
    }
    if (message.type === 'get_focus') {
      getFocusStateFromSocket(message)
    }
    if (message.type === 'reconnect') {
      reconnectWebSocket()
    }
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

interface FocusingMessage {
  type: string;
  focusing: boolean;
  since_last_change: number;
  focus_time_left: number;
}

function isFocusing(message: object): message is FocusingMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof (message as FocusingMessage).type === 'string' &&
    'focusing' in message &&
    typeof (message as FocusingMessage).focusing === 'boolean' &&
    'since_last_change' in message &&
    typeof (message as FocusingMessage).since_last_change === 'number' &&
    'focus_time_left' in message &&
    typeof (message as FocusingMessage).focus_time_left === 'number'
  );
}

function setupSocketListeners() {
  if (socket === null) {
    console.log('No WebSocket connection');
    return;
  }
  socket.onopen = () => {
    console.log('Connected to Coach server');
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    reconnectWebSocket();
  };

  socket.onclose = () => {
    console.log('Disconnected from Coach server');
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log("Socket get message", message);
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
  }
}

export default defineBackground({
  persistent: true,
  main() {
    const serverUrl = import.meta.env.VITE_SERVER as string;
    connectWebSocket(serverUrl);
    setupBackgroundScriptListeners();
    setupConnectionHealthCheck();
  }
});
