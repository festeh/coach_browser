const form = document.getElementById('whitelistForm')!;
const textarea = document.getElementById('whitelistSites')!;
const whitelistItems = document.getElementById('whitelistItems')!;

// Load current whitelist on page load
document.addEventListener('DOMContentLoaded', loadWhitelist);

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  const sites = (textarea.textContent || '').split('\n')
    .filter(site => site.trim() !== '')
    .map(site => site.replace("*.", '').trim());
  await browser.storage.local.set({ whitelist: sites })
  console.log('Whitelist saved');
  loadWhitelist();
  textarea.textContent = '';
});

async function loadWhitelist() {
  const whitelist = await browser.storage.local.get(['whitelist']) || []
  whitelistItems.innerHTML = '';
  whitelist.forEach((site: string) => {
    const li = document.createElement('li');
    li.textContent = site;
    whitelistItems.appendChild(li);
  });
}

form.addEventListener('reset', async () => {
  await browser.storage.local.set({ whitelist: [] })
  loadWhitelist();
  textarea.textContent = '';
});
