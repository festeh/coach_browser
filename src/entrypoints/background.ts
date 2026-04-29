import { blockPage } from "@/lib/blocking";
import {
  logError,
  WebSocketManager,
  TimerManager
} from "@/lib/background";
import type { ExtensionMessage } from "@/lib/background";
import { getStorage, setStorage } from "@/lib/storage";
import { updateIcon } from "@/lib/icons";

const serverUrl = import.meta.env.VITE_SERVER as string;
const RECONNECT_CHECK_ALARM = "reconnect-check";

let wsManager: WebSocketManager;
let timerManager: TimerManager;

function setupBrowserListeners(): void {
  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    switch (message.type) {
      case "get_focus":
        wsManager.send(message);
        break;
      case "reconnect":
        wsManager.reconnect();
        break;
    }
  });

  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    const { tabId, url, frameId } = details;
    if (!url || !url.startsWith("http") || frameId !== 0) {
      return;
    }

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
        const { focusing, agent_release_time_left } = await getStorage("focusing", "agent_release_time_left");
        await updateIcon(true, focusing || agent_release_time_left === null);
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
            agent_release_time_left: message.agent_release_time_left,
            last_update_timestamp: Date.now()
          });
          await updateIcon(true, message.focusing || message.agent_release_time_left === null);
        } catch (error) {
          logError("Error saving focus to storage", error);
        }
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
  wsManager.connect();
}
