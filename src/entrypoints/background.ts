import { blockPage, type BlockResult } from "@/lib/blocking";
import {
  logError,
  WebSocketManager,
  queryAttention
} from "@/lib/background";
import type { ExtensionMessage } from "@/lib/background";
import { getStorage, setStorage } from "@/lib/storage";
import { updateIcon } from "@/lib/icons";
import { browserSource } from "@/lib/source";

const serverUrl = import.meta.env.VITE_SERVER as string;
const coachToken = (import.meta.env.VITE_COACH_TOKEN as string | undefined) ?? "";
const RECONNECT_CHECK_ALARM = "reconnect-check";
const SOURCE = browserSource();

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
      case "override":
        // From the chat page: rides the coach socket like temptations do,
        // so the page needs no host permissions of its own.
        wsManager.send(message);
        break;
    }
  });

  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    const { tabId, url, frameId } = details;
    if (!url || !url.startsWith("http") || frameId !== 0) {
      return;
    }

    void reportIfBlocked(tabId, await blockPage({ url, tabId }));
  });

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (!tabId) return;

    const { url } = changeInfo;
    if (!url || !url.startsWith("http")) return;

    void reportIfBlocked(tabId, await blockPage({ url, tabId }));
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === RECONNECT_CHECK_ALARM) {
      wsManager.ensureConnected();
      // Heartbeat half of the attention beacon: confirms "still on X" even
      // if the service worker slept through every transition since last tick.
      void sendAttention();
      void reloadIfNewBuild();
      void syncWhitelistFromFile();
    }
  });
}

// Transition half of the attention beacon: any change to what could have the
// user's attention re-queries live state and reports it immediately.
function setupAttentionListeners(): void {
  const report = () => void sendAttention();

  browser.tabs.onActivated.addListener(report);
  // Desktop-only signals — Firefox for Android has neither API.
  browser.windows?.onFocusChanged.addListener(report);
  browser.idle?.onStateChanged.addListener(report);
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

// The whitelist lives in a text file next to the bundle (public/whitelist.txt
// in the repo), one hostname per line, # for comments. The file is the source
// of truth: whenever its parsed content differs from storage, storage is
// replaced. Same disk-read trick as build.json — on Chrome an edited file
// lands within one alarm tick; a missing or unreadable file changes nothing.
async function syncWhitelistFromFile(): Promise<void> {
  try {
    const res = await fetch(browser.runtime.getURL("/whitelist.txt"));
    if (!res.ok) return;
    const sites = (await res.text())
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));
    const { whitelist } = await getStorage("whitelist");
    const changed = JSON.stringify([...sites].sort()) !== JSON.stringify([...whitelist].sort());
    if (changed) {
      await setStorage({ whitelist: sites });
      console.info(`[coach] whitelist synced from file (${sites.length} sites)`);
    }
  } catch {
    // Old bundle without the file, or xpi mid-replacement: keep what we have.
  }
}

// Chrome serves an unpacked extension's resources from disk, so build.json
// reflects whatever `npm run install:browsers` last wrote there — while
// __BUILD_DATE__ is frozen into the running code. A mismatch means a newer
// build is on disk; reload to become it. On Firefox the xpi read may be
// cached or mid-replacement — any fetch failure just means "try next tick".
async function reloadIfNewBuild(): Promise<void> {
  try {
    const res = await fetch(browser.runtime.getURL("/build.json"));
    const { build } = (await res.json()) as { build?: string };
    if (build && build !== __BUILD_DATE__) {
      console.info(`[coach] build ${build} found on disk (running ${__BUILD_DATE__}), reloading`);
      browser.runtime.reload();
    }
  } catch {
    // Old bundle without build.json, or unreadable mid-install: no-op.
  }
}

// Report a temptation only when the blocked tab is the active one — a
// background tab refreshing a blocked site is noise, not a deliberate reach.
async function reportIfBlocked(tabId: number, result: BlockResult): Promise<void> {
  if (!result.blocked) return;
  try {
    const [active] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    if (active?.id !== tabId) return;
    wsManager.send({ type: "temptation", source: SOURCE, target: result.target });
  } catch (error) {
    logError("Failed to send temptation", error);
  }
}

export default defineBackground({
  main() {
    // Print the build stamp on every boot so the service-worker console says
    // which bundle is actually running.
    console.info(`[coach] background started — build ${__BUILD_DATE__}`);
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
    }, coachToken);

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
  await syncWhitelistFromFile();
  wsManager.connect();
}
