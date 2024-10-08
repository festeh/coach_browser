


interface BlockOptions {
  tabId: number
  url: string
}

export async function blockPage(options: BlockOptions) {
  const focus = await browser.storage.local.get('focus');
  const whitelist = await browser.storage.local.get('whitelist');
  
  if (focus.focus === true) {
    // Check if the URL is in the whitelist
    const isWhitelisted = whitelist.whitelist && whitelist.whitelist.some((site: string) => options.url.includes(site));
    
    if (!isWhitelisted) {
      console.log('blocked page', options);
      const redirectProps = { url: 'https://todoist.com' };
      browser.tabs.update(options.tabId, { ...redirectProps, loadReplace: true });
    } else {
      console.log('whitelisted page, not blocking', options);
    }
  }
}
