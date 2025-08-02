interface BlockOptions {
  tabId: number
  url: string
}

export async function blockPage(options: BlockOptions) {
  const focusing = await browser.storage.local.get('focusing');
  const whitelist = await browser.storage.local.get('whitelist');
  console.log("checking page")
  if (focusing.focusing === true) {
    console.log("blocking mode enabled")
    // Check if the URL is in the whitelist
    const isWhitelisted = whitelist.whitelist && whitelist.whitelist.some((site: string) => options.url.includes(site));

    if (!isWhitelisted) {
      console.log('blocked page', options);
      browser.tabs.update(options.tabId, { url: 'https://todoist.com' });
    } else {
      console.log('whitelisted page, not blocking', options);
    }
  }
}
