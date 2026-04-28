import type { ExtensionMessage } from "@/lib/background";
import { getStorage } from "@/lib/storage";

interface BlockOptions {
  tabId: number
  url: string
}

function redirectHostname(redirectUrl: string): string | null {
  if (!redirectUrl) return null;
  try {
    return new URL(redirectUrl).hostname;
  } catch {
    return null;
  }
}

export async function blockPage(options: BlockOptions) {
  const { focusing, agent_release_time_left, whitelist, redirect_url } = await getStorage('focusing', 'agent_release_time_left', 'whitelist', 'redirect_url');

  if (!focusing && agent_release_time_left !== null) return;

  const effectiveWhitelist = [...whitelist];
  const redirectHost = redirectHostname(redirect_url);
  if (redirectHost) effectiveWhitelist.push(redirectHost);

  const isWhitelisted = effectiveWhitelist.some(site => options.url.includes(site));
  if (isWhitelisted) return;

  if (redirect_url) {
    browser.tabs.update(options.tabId, { url: redirect_url });
  } else {
    const msg: ExtensionMessage = { type: 'BLOCKED_ALERT' };
    browser.tabs.sendMessage(options.tabId, msg);
  }
}
