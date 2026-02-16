import { blockPage } from "@/lib/blocking";
import { getRandomPhrase } from "@/lib/notifications";
import {
  DEFAULT_FOCUS_DURATION_SECONDS,
  logError,
  WebSocketManager,
  TimerManager
} from "@/lib/background";
import type { ExtensionMessage } from "@/lib/background";
import { getStorage, setStorage } from "@/lib/storage";

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
    wsManager.send({ type: "focus", duration: DEFAULT_FOCUS_DURATION_SECONDS });
  });

  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    switch (message.type) {
      case "get_focus":
        wsManager.send(message);
        break;
      case "reconnect":
        wsManager.reconnect(true);
        break;
      case "show_notification":
        showNotification();
        break;
    }
  });

  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    const { tabId, url, frameId } = details;
    if (!url || !url.startsWith("http") || frameId !== 0) {
      return;
    }

    await setStorage({
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
  async main() {
    await setStorage({ connected: false });

    const { last_interaction_timestamp } = await getStorage("last_interaction_timestamp");
    if (!last_interaction_timestamp) {
      await setStorage({
        last_interaction: 0,
        last_interaction_timestamp: Date.now()
      });
    }

    timerManager = new TimerManager({ showNotification });

    wsManager = new WebSocketManager(serverUrl, {
      onConnected: () => {
        setStorage({ connected: true });
      },
      onDisconnected: () => {
        setStorage({ connected: false });
      },
      onFocusMessage: async (message) => {
        try {
          await setStorage({
            focusing: message.focusing,
            since_last_change: message.since_last_change,
            focus_time_left: message.focus_time_left,
            last_update_timestamp: Date.now()
          });
          timerManager.startTimeUpdateTimer();
        } catch (error) {
          logError("Error saving focus to storage", error);
        }
      }
    });

    setupBrowserListeners();
    wsManager.connect();
    timerManager.startTimeUpdateTimer();
    timerManager.startLastInteractionUpdateTimer();
  }
});
