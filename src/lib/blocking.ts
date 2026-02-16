import type { ExtensionMessage } from "@/lib/background";
import { getStorage } from "@/lib/storage";

interface BlockOptions {
  tabId: number
  url: string
}

export async function blockPage(options: BlockOptions) {
  const { focusing, whitelist, redirect_url } = await getStorage('focusing', 'whitelist', 'redirect_url');

  if (focusing) {
    const isWhitelisted = whitelist.some(site => options.url.includes(site));

    if (!isWhitelisted) {
      if (redirect_url) {
        browser.tabs.update(options.tabId, { url: redirect_url });
      } else {
        const msg: ExtensionMessage = { type: 'BLOCKED_ALERT' };
        browser.tabs.sendMessage(options.tabId, msg);
      }
    }
  }
}
