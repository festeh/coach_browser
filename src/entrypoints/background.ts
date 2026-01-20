import { blockPage } from "@/lib/blocking";
import { getRandomPhrase } from "@/lib/notifications";
import {
  DEFAULT_FOCUS_DURATION_SECONDS,
  logError,
  Message,
  WebSocketManager,
  TimerManager
} from "@/lib/background";

const serverUrl = import.meta.env.VITE_SERVER as string;

let wsManager: WebSocketManager;
let timerManager: TimerManager;

function showNotification(): void {
  const text = getRandomPhrase();

  browser.notifications.create({
    type: "basic",
    iconUrl: "c-48.jpeg",
    title: "Coach",
    message: text
  }).catch((error) => {
    logError("Error creating notification", error);
  });
}

function setupBrowserListeners(): void {
  browser.notifications.onClicked.addListener(() => {
    wsManager.send({ type: "focus", duration: DEFAULT_FOCUS_DURATION_SECONDS } as Message);
  });

  browser.runtime.onMessage.addListener((message: Message) => {
    if (message.type === "get_focus") {
      wsManager.send(message);
    }
    if (message.type === "reconnect") {
      wsManager.reconnect(true);
    }
    if (message.type === "show_notification") {
      showNotification();
    }
  });

  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    const { tabId, url, frameId } = details;
    if (!url || !url.startsWith("http") || frameId !== 0) {
      return;
    }

    await browser.storage.local.set({
      last_interaction: 0,
      last_interaction_timestamp: Date.now()
    });

    blockPage({ url, tabId });
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (!tabId) return;

    const { url } = changeInfo;
    if (!url || !url.startsWith("http")) return;

    blockPage({ url, tabId });
  });
}

export default defineBackground({
  persistent: true,
  main() {
    browser.storage.local.set({ connected: false });

    browser.storage.local.get(["last_interaction_timestamp"]).then((data) => {
      if (!data.last_interaction_timestamp) {
        browser.storage.local.set({
          last_interaction: 0,
          last_interaction_timestamp: Date.now()
        });
      }
    });

    timerManager = new TimerManager({ showNotification });

    wsManager = new WebSocketManager(serverUrl, {
      onConnected: () => {
        browser.storage.local.set({ connected: true });
      },
      onDisconnected: () => {
        browser.storage.local.set({ connected: false });
      },
      onFocusMessage: (message) => {
        browser.storage.local.set({
          focusing: message.focusing,
          since_last_change: message.since_last_change,
          focus_time_left: message.focus_time_left,
          last_update_timestamp: Date.now()
        }).then(() => {
          timerManager.startTimeUpdateTimer();
        }).catch((error) => {
          logError("Error saving focus to storage", error);
        });
      }
    });

    setupBrowserListeners();
    wsManager.connect();
    timerManager.startTimeUpdateTimer();
    timerManager.startLastInteractionUpdateTimer();
  }
});
