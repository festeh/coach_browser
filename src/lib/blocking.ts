


interface BlockOptions {
  tabId: number
  url: string
}

export function blockPage(options: BlockOptions) {
  console.log('blocked page', options);
}
