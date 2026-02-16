import { blockPage } from "@/lib/blocking";
import {
  logError,
  WebSocketManager,
  TimerManager
} from "@/lib/background";
import type { ExtensionMessage, HookResultMessage } from "@/lib/background";
import { getStorage, setStorage } from "@/lib/storage";

const serverUrl = import.meta.env.VITE_SERVER as string;

let wsManager: WebSocketManager;
let timerManager: TimerManager;

async function showHookNotification(message: HookResultMessage): Promise<void> {
  try {
    const state = await browser.idle.queryState(60);
    if (state !== "active") return;

    await browser.notifications.create(message.id, {
      type: "basic",
      iconUrl: "c-48.jpeg",
      title: "Coach",
      message: message.content
    });
  } catch (error) {
    logError("Error creating hook notification", error);
  }
}

function setupBrowserListeners(): void {
  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    switch (message.type) {
      case "get_focus":
        wsManager.send(message);
        break;
      case "reconnect":
        wsManager.reconnect(true);
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

    timerManager = new TimerManager();

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
      },
      onHookResult: (message) => {
        showHookNotification(message);
      }
    });

    setupBrowserListeners();
    wsManager.connect();
    timerManager.startTimeUpdateTimer();
    timerManager.startLastInteractionUpdateTimer();
  }
});
