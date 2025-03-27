import { blockPage } from "@/lib/blocking";
import { z } from "zod";

let socket: WebSocket | null = null;
const serverUrl = import.meta.env.VITE_SERVER as string;

function connectWebSocket() {
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
  console.log("Attempting to reconnect to WebSocket server...");
  setTimeout(connectWebSocket, 500);
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

const focusingMessageSchema = z.object({
  type: z.string(),
  focusing: z.boolean(),
  since_last_change: z.number(),
  focus_time_left: z.number()
});

type FocusingMessage = z.infer<typeof focusingMessageSchema>;

function isFocusing(message: object): message is FocusingMessage {
  return focusingMessageSchema.safeParse(message).success;
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
    setTimeout(() => {
      reconnectWebSocket();
    }, 5000)
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
    if (isFocusing(message)) {
      browser.storage.local.set({ focusing: message.focusing }).then(() => {
        console.log('Focus saved to storage:', message);
      }).catch((error) => {
        console.error('Error saving focus to storage:', error);
      });
    }
  }
}

export default defineBackground({
  persistent: true,
  main() {
    connectWebSocket();
    setupBackgroundScriptListeners();
    setupConnectionHealthCheck();
  }
});
