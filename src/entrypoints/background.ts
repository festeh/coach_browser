import { blockPage } from "@/lib/blocking";
import { z } from "zod";

// Timing constants
const HEALTH_CHECK_INTERVAL_MS = 60000;
const TIME_UPDATE_INTERVAL_MS = 30000;
const INTERACTION_UPDATE_INTERVAL_MS = 60000;
const RECONNECT_BASE_DELAY_MS = 500;
const TWO_HOURS_SECONDS = 2 * 60 * 60;
const FIVE_MINUTES_SECONDS = 5 * 60;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

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

  browser.notifications.create({
    type: 'basic',
    iconUrl: 'c-48.jpeg',
    title: 'Coach',
    message: text
  }).catch((error) => {
    console.error('Error creating notification:', error);
  });
}

let socket: WebSocket | null = null;
const serverUrl = import.meta.env.VITE_SERVER as string;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let timeUpdateTimer: number | null = null;
let lastInteractionUpdateTimer: number | null = null;
let healthCheckInterval: number | null = null;

function connectWebSocket() {
  socket = new WebSocket(`${serverUrl}/connect`);
  setupSocketListeners();
};

interface Message {
  type: string;
}

function getFocusStateFromSocket(message: Message) {
  if (socket === null) {
    return;
  }
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: message.type }));
  }
}

function reconnectWebSocket() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn("Maximum reconnect attempts reached. Stopping reconnection attempts.");
    return;
  }

  reconnectAttempts++;

  if (socket) {
    socket.close();
  }
  setTimeout(connectWebSocket, RECONNECT_BASE_DELAY_MS * reconnectAttempts);
}

function setupConnectionHealthCheck() {
  setTimeout(() => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }
    healthCheckInterval = setInterval(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        reconnectWebSocket();
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }, HEALTH_CHECK_INTERVAL_MS);
}

function setupBackgroundScriptListeners() {
  // Handle notification clicks - start a focus session
  browser.notifications.onClicked.addListener(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'focus', duration: 30 * 60 }));
    }
  });

  browser.runtime.onMessage.addListener((message: Message) => {
    if (message.type === 'get_focus') {
      getFocusStateFromSocket(message);
    }
    if (message.type === 'reconnect') {
      reconnectWebSocket();
    }
    if (message.type === 'show_notification') {
      showNotification();
    }
  });
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

        await browser.storage.local.set({
          since_last_change: newSinceLastChange,
          last_update_timestamp: now
        });

        // Check notification conditions
        const isFocused = data.focusing;
        const timeSinceLastFocus = newSinceLastChange;
        const timeSinceLastInteraction = data.last_interaction || 0;
        const lastNotificationSent = data.last_notification_sent || 0;

        // Notification logic: not focused, >2h since focus, <5m since interaction, not sent in last 2h
        if (!isFocused &&
            timeSinceLastFocus > TWO_HOURS_SECONDS &&
            timeSinceLastInteraction < FIVE_MINUTES_SECONDS &&
            (now - lastNotificationSent) > TWO_HOURS_MS) {
          showNotification();
          await browser.storage.local.set({
            last_notification_sent: now
          });
        }
      }
    } catch (error) {
      console.error('Error updating time:', error);
    }
  }, TIME_UPDATE_INTERVAL_MS);
}

function startLastInteractionUpdateTimer() {
  if (lastInteractionUpdateTimer) {
    clearInterval(lastInteractionUpdateTimer);
  }

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
  }, INTERACTION_UPDATE_INTERVAL_MS);
}

function setupSocketListeners() {
  if (socket === null) {
    return;
  }
  socket.onopen = () => {
    reconnectAttempts = 0;
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    setTimeout(() => {
      reconnectWebSocket();
    }, 5000);
  };

  socket.onclose = () => {};

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (isFocusing(message)) {
        browser.storage.local.set({
          focusing: message.focusing,
          since_last_change: message.since_last_change,
          focus_time_left: message.focus_time_left,
          last_update_timestamp: Date.now()
        }).then(() => {
          startTimeUpdateTimer();
        }).catch((error) => {
          console.error('Error saving focus to storage:', error);
        });
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };
}

export default defineBackground({
  persistent: true,
  main() {
    // Initialize last interaction timestamp if not exists
    browser.storage.local.get(['last_interaction_timestamp']).then((data) => {
      if (!data.last_interaction_timestamp) {
        browser.storage.local.set({
          last_interaction: 0,
          last_interaction_timestamp: Date.now()
        });
      }
    });

    setupBackgroundScriptListeners();
    connectWebSocket();
    setupConnectionHealthCheck();
    startTimeUpdateTimer();
    startLastInteractionUpdateTimer();
  }
});
