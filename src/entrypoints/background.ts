import { blockPage } from "@/lib/blocking";
import {
  logError,
  WebSocketManager,
  TimerManager
} from "@/lib/background";
import type { ExtensionMessage, HookResultMessage } from "@/lib/background";
import { getStorage, setStorage } from "@/lib/storage";
import { updateIcon } from "@/lib/icons";

const serverUrl = import.meta.env.VITE_SERVER as string;
const RECONNECT_CHECK_ALARM = "reconnect-check";

let wsManager: WebSocketManager;
let timerManager: TimerManager;

async function showHookNotification(message: HookResultMessage): Promise<void> {
  try {
    const state = await browser.idle.queryState(60);
    if (state !== "active") return;

    await browser.notifications.create(message.id, {
      type: "basic",
      iconUrl: "active-48.png",
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

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === RECONNECT_CHECK_ALARM) {
      wsManager.ensureConnected();
    }
  });
}

export default defineBackground({
  main() {
    // MV3 service workers replay events that fire while the SW is asleep, but
    // only to listeners registered synchronously during script evaluation.
    // Anything past an `await` may miss wakeup events, so wire listeners and
    // construct managers up front, then do async init in the background.
    timerManager = new TimerManager();

    wsManager = new WebSocketManager(serverUrl, {
      onConnected: async () => {
        await setStorage({ connected: true, reconnect_at: 0 });
        const { focusing } = await getStorage("focusing");
        await updateIcon(true, focusing);
      },
      onDisconnected: async () => {
        await setStorage({ connected: false });
        await updateIcon(false, false);
      },
      onReconnectScheduled: (reconnectAt) => {
        setStorage({ reconnect_at: reconnectAt });
      },
      onFocusMessage: async (message) => {
        try {
          await setStorage({
            focusing: message.focusing,
            since_last_change: message.since_last_change,
            focus_time_left: message.focus_time_left,
            last_update_timestamp: Date.now()
          });
          await updateIcon(true, message.focusing);
        } catch (error) {
          logError("Error saving focus to storage", error);
        }
      },
      onHookResult: (message) => {
        showHookNotification(message);
      }
    });

    setupBrowserListeners();
    timerManager.registerHandlers();
    timerManager.start();
    browser.alarms.create(RECONNECT_CHECK_ALARM, { periodInMinutes: 0.5 });

    void initState();
  }
});

async function initState(): Promise<void> {
  await setStorage({ connected: false });
  await updateIcon(false, false);

  const { last_interaction_timestamp } = await getStorage("last_interaction_timestamp");
  if (!last_interaction_timestamp) {
    await setStorage({
      last_interaction: 0,
      last_interaction_timestamp: Date.now()
    });
  }

  wsManager.connect();
}
