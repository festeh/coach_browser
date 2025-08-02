import { blockPage } from "@/lib/blocking";
import { z } from "zod";

let socket: WebSocket | null = null;
const serverUrl = import.meta.env.VITE_SERVER as string;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let timeUpdateTimer: number | null = null;

function connectWebSocket() {
  socket = new WebSocket(`${serverUrl}/connect`);
  setupSocketListeners();
};

interface Message {
  type: string;
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
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log("Maximum reconnect attempts reached. Stopping reconnection attempts.");
    return;
  }

  reconnectAttempts++;
  console.log(`Attempting to reconnect to WebSocket server... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

  if (socket) {
    socket.close();
  }
  console.log("Attempting to reconnect to WebSocket server...");
  setTimeout(connectWebSocket, 500 * reconnectAttempts);
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

function startTimeUpdateTimer() {
  if (timeUpdateTimer) {
    clearInterval(timeUpdateTimer);
  }
  
  console.log('Starting time update timer');
  timeUpdateTimer = setInterval(async () => {
    try {
      const data = await browser.storage.local.get(['focusing', 'since_last_change', 'last_update_timestamp']);
      if (data.focusing !== undefined && data.since_last_change !== undefined && data.last_update_timestamp) {
        const now = Date.now();
        const elapsed = Math.floor((now - data.last_update_timestamp) / 1000);
        const newSinceLastChange = data.since_last_change + elapsed;
        
        // console.log(`Updating time: ${data.since_last_change} + ${elapsed} = ${newSinceLastChange}`);
        
        await browser.storage.local.set({
          since_last_change: newSinceLastChange,
          last_update_timestamp: now
        });
      } else {
        console.log('Timer skipped - missing data or timestamp');
      }
    } catch (error) {
      console.error('Error updating time:', error);
    }
  }, 30000); // Update every 30 seconds
}

function setupSocketListeners() {
  if (socket === null) {
    console.log('No WebSocket connection');
    return;
  }
  socket.onopen = () => {
    console.log('Connected to Coach server');
    reconnectAttempts = 0;
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
    if (isFocusing(message)) {
      browser.storage.local.set({
        focusing: message.focusing,
        since_last_change: message.since_last_change,
        focus_time_left: message.focus_time_left,
        last_update_timestamp: Date.now()
      }).then(() => {
        console.log('Focus saved to storage:', message);
        startTimeUpdateTimer(); // Restart timer when new websocket data arrives
      }).catch((error) => {
        console.error('Error saving focus to storage:', error);
      });
    }
  }
}

export default defineBackground({
  persistent: true,
  main() {
    console.log('Background script main() called');
    connectWebSocket();
    setupBackgroundScriptListeners();
    setupConnectionHealthCheck();
    startTimeUpdateTimer();
    console.log('Background script initialization complete');
  }
});
