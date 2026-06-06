import { blockPage } from "@/lib/blocking";
import {
  logError,
  WebSocketManager,
  queryAttention
} from "@/lib/background";
import type { ExtensionMessage } from "@/lib/background";
import { getStorage, setStorage } from "@/lib/storage";
import { updateIcon } from "@/lib/icons";

const serverUrl = import.meta.env.VITE_SERVER as string;
const RECONNECT_CHECK_ALARM = "reconnect-check";

let wsManager: WebSocketManager;

function setupBrowserListeners(): void {
  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    switch (message.type) {
      case "get_focusing":
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
      // Heartbeat half of the attention beacon: confirms "still on X" even
      // if the service worker slept through every transition since last tick.
      void sendAttention();
    }
  });
}

// Transition half of the attention beacon: any change to what could have the
// user's attention re-queries live state and reports it immediately.
function setupAttentionListeners(): void {
  const report = () => void sendAttention();

  browser.tabs.onActivated.addListener(report);
  browser.windows.onFocusChanged.addListener(report);
  browser.idle.onStateChanged.addListener(report);
  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    // URL changes move attention; audible changes toggle the watching-video
    // exception to idle. Either way only the active tab matters.
    if (tab.active && (changeInfo.url || changeInfo.audible !== undefined)) {
      report();
    }
  });
}

async function sendAttention(): Promise<void> {
  try {
    wsManager.send(await queryAttention());
  } catch (error) {
    logError("Failed to send attention beacon", error);
  }
}

export default defineBackground({
  main() {
    // MV3 service workers replay events that fire while the SW is asleep, but
    // only to listeners registered synchronously during script evaluation.
    // Anything past an `await` may miss wakeup events, so wire listeners and
    // construct managers up front, then do async init in the background.
    wsManager = new WebSocketManager(serverUrl, {
      onConnected: async () => {
        await setStorage({ connected: true, reconnect_at: 0 });
        const { focusing, agent_release_time_left } = await getStorage("focusing", "agent_release_time_left");
        await updateIcon(true, focusing || agent_release_time_left === null);
        // Give the server the current attention state right away rather than
        // waiting for the next transition or heartbeat.
        void sendAttention();
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
            agent_release_time_left: message.agent_release_time_left
          });
          await updateIcon(true, message.focusing || message.agent_release_time_left === null);
        } catch (error) {
          logError("Error saving focus to storage", error);
        }
      }
    });

    setupBrowserListeners();
    try {
      setupAttentionListeners();
    } catch (error) {
      // The attention sensor is auxiliary — a failure here (e.g. a stale
      // permission grant on an unpacked install) must not take down
      // blocking and the WebSocket with it.
      logError("Failed to set up attention listeners", error);
    }
    browser.alarms.create(RECONNECT_CHECK_ALARM, { periodInMinutes: 0.5 });

    void initState();
  }
});

async function initState(): Promise<void> {
  await setStorage({ connected: false });
  await updateIcon(false, false);
  wsManager.connect();
}
