import { getStorage } from "@/lib/storage";

interface BlockOptions {
  tabId: number
  url: string
}

// What blockPage did, so the caller can report a temptation when it blocked.
export interface BlockResult {
  blocked: boolean
  target: string
}

function redirectHostname(redirectUrl: string): string | null {
  if (!redirectUrl) return null;
  try {
    return new URL(redirectUrl).hostname;
  } catch {
    return null;
  }
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export async function blockPage(options: BlockOptions): Promise<BlockResult> {
  const notBlocked: BlockResult = { blocked: false, target: "" };

  const { focusing, agent_release_time_left, whitelist, redirect_url } = await getStorage('focusing', 'agent_release_time_left', 'whitelist', 'redirect_url');

  if (!focusing && agent_release_time_left !== null) return notBlocked;

  const effectiveWhitelist = [...whitelist];
  const redirectHost = redirectHostname(redirect_url);
  if (redirectHost) effectiveWhitelist.push(redirectHost);

  const isWhitelisted = effectiveWhitelist.some(site => options.url.includes(site));
  if (isWhitelisted) return notBlocked;

  const target = hostnameOf(options.url);
  if (redirect_url) {
    browser.tabs.update(options.tabId, { url: redirect_url });
  } else {
    // Default: land in the coach chat, where the plea (or the override)
    // happens — carrying which wall was hit.
    const chatUrl = `${browser.runtime.getURL('/chat.html')}?blocked=${encodeURIComponent(target)}`;
    browser.tabs.update(options.tabId, { url: chatUrl });
  }

  return { blocked: true, target };
}
