


interface BlockOptions {
  tabId: number
  url: string
}

export async function blockPage(options: BlockOptions) {
  const focus = await browser.storage.local.get('focus');
  if (focus.focus === true) {
    console.log('blocked page', options);
    const redirectProps = { url: 'https://todoist.com' };
    browser.tabs.update(options.tabId, { ...redirectProps, loadReplace: true });
  }
}
