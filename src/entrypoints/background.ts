import { blockPage } from "@/lib/blocking";
import { z } from "zod";

const motivationalPhrases = [
  "The best time to plant a tree was 20 years ago. The second best time is now",
  "You don't have to be great to start, but you have to start to be great",
  "Focus on the possibilities for success, not on the potential for failure",
  "The only way to do great work is to love what you do",
  "Do not wait to strike till the iron is hot; but make it hot by striking",
  "Concentration is the secret of strength",
  "The future depends on what you do today",
  "It does not matter how slowly you go as long as you do not stop",
  "Your time is limited, don't waste it living someone else's life",
  "Discipline is choosing between what you want now and what you want most",
  "The way to get started is to quit talking and begin doing",
  "Focus on being productive instead of busy",
  "What you do today can improve all your tomorrows",
  "A year from now you may wish you had started today",
  "Don't watch the clock; do what it does. Keep going",
  "Success is the sum of small efforts repeated day in and day out",
  "Don't dwell on what went wrong. Instead, focus on what to do next. Spend your energies on moving forward toward finding the answer",
  "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus",
  "The successful warrior is the average man, with laser-like focus",
  "You can't do big things if you're distracted by small things",
  "It's not whether you get knocked down, it's whether you get back up.",
  "Our greatest weakness lies in giving up. The most certain way to succeed is always to try just one more time.",
  "The mind is like water. When it's turbulent, it's difficult to see. When it's calm, everything becomes clear."
];

function getRandomPhrase(): string {
  const randomIndex = Math.floor(Math.random() * motivationalPhrases.length);
  return motivationalPhrases[randomIndex];
}

function showNotification(): void {
  const text = getRandomPhrase();
  console.log('Background: showNotification called with text:', text);

  browser.notifications.create({
    type: 'basic',
    iconUrl: 'c-48.jpeg',
    title: 'Coach',
    message: text
  }).then((notificationId) => {
    console.log('Background: Notification created with ID:', notificationId);
  }).catch((error) => {
    console.error('Background: Error creating notification:', error);
  });
}

let socket: WebSocket | null = null;
const serverUrl = import.meta.env.VITE_SERVER as string;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let timeUpdateTimer: number | null = null;
let lastInteractionUpdateTimer: number | null = null;

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
  console.log('Background: Setting up message listeners');
  browser.runtime.onMessage.addListener((message: Message) => {
    console.log('Background: Received message:', message);
    if (message.type === 'get_focus') {
      console.log('Background: Handling get_focus message');
      getFocusStateFromSocket(message)
    }
    if (message.type === 'reconnect') {
      console.log('Background: Handling reconnect message');
      reconnectWebSocket()
    }
    if (message.type === 'show_notification') {
      console.log('Background: Received show_notification message');
      showNotification()
    }
  })
  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    const { tabId, url, frameId } = details;
    if (!url || !url.startsWith("http") || frameId !== 0) {
      return;
    }
    
    // Track last interaction time
    await browser.storage.local.set({
      last_interaction: 0, // Reset to 0 since this is a fresh interaction
      last_interaction_timestamp: Date.now()
    });
    
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
      const data = await browser.storage.local.get([
        'focusing', 
        'since_last_change', 
        'last_update_timestamp',
        'last_interaction',
        'last_notification_sent'
      ]);
      
      if (data.focusing !== undefined && data.since_last_change !== undefined && data.last_update_timestamp) {
        const now = Date.now();
        const elapsed = Math.floor((now - data.last_update_timestamp) / 1000);
        const newSinceLastChange = data.since_last_change + elapsed;
        
        // console.log(`Updating time: ${data.since_last_change} + ${elapsed} = ${newSinceLastChange}`);
        
        await browser.storage.local.set({
          since_last_change: newSinceLastChange,
          last_update_timestamp: now
        });

        // Check notification conditions
        const isFocused = data.focusing;
        const timeSinceLastFocus = newSinceLastChange; // seconds since last focus change
        const timeSinceLastInteraction = data.last_interaction || 0; // seconds since last interaction
        const lastNotificationSent = data.last_notification_sent || 0; // timestamp of last notification
        
        // Notification logic: not focused, >2h since focus, <5m since interaction, not sent in last 2h
        const twoHoursInSeconds = 2 * 60 * 60;
        const fiveMinutesInSeconds = 5 * 60;
        const twoHoursInMs = 2 * 60 * 60 * 1000;

        console.log({
          isFocused,
          timeSinceLastFocus,
          timeSinceLastInteraction,
          timeSinceLastNotification: (now - lastNotificationSent) / 1000
        });
        
        if (!isFocused && 
            timeSinceLastFocus > twoHoursInSeconds && 
            timeSinceLastInteraction < fiveMinutesInSeconds &&
            (now - lastNotificationSent) > twoHoursInMs) {

          console.log("sending notification")
          
          showNotification();
          await browser.storage.local.set({
            last_notification_sent: now
          });
        }
      } else {
        console.log('Timer skipped - missing data or timestamp');
      }
    } catch (error) {
      console.error('Error updating time:', error);
    }
  }, 30000); // Update every 30 seconds
}

function startLastInteractionUpdateTimer() {
  if (lastInteractionUpdateTimer) {
    clearInterval(lastInteractionUpdateTimer);
  }
  
  console.log('Starting last interaction update timer');
  lastInteractionUpdateTimer = setInterval(async () => {
    try {
      const data = await browser.storage.local.get(['last_interaction', 'last_interaction_timestamp']);
      if (data.last_interaction !== undefined && data.last_interaction_timestamp) {
        const now = Date.now();
        const elapsed = Math.floor((now - data.last_interaction_timestamp) / 1000);
        const newLastInteraction = data.last_interaction + elapsed;
        
        await browser.storage.local.set({
          last_interaction: newLastInteraction,
          last_interaction_timestamp: now
        });
      }
    } catch (error) {
      console.error('Error updating last interaction time:', error);
    }
  }, 60000); // Update every minute
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
    
    // Initialize last interaction timestamp if not exists
    browser.storage.local.get(['last_interaction_timestamp']).then((data) => {
      if (!data.last_interaction_timestamp) {
        browser.storage.local.set({
          last_interaction: 0,
          last_interaction_timestamp: Date.now()
        });
      }
    });
    
    console.log('Background: About to setup listeners');
    setupBackgroundScriptListeners();
    console.log('Background: Listeners setup complete');
    
    connectWebSocket();
    setupConnectionHealthCheck();
    startTimeUpdateTimer();
    startLastInteractionUpdateTimer();
    console.log('Background script initialization complete');
  }
});
