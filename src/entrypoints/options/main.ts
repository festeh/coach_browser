const form = document.getElementById('whitelistForm')!;
const textarea = document.getElementById('whitelistSites')!;
const whitelistItems = document.getElementById('whitelistItems')!;

// Load current whitelist on page load
document.addEventListener('DOMContentLoaded', loadWhitelist);

form.addEventListener('submit', async function (e) {
  console.log('submit', textarea, textarea.textContent, textarea.nodeValue, textarea.value);
  e.preventDefault();
  const sites = (textarea.value || '').split('\n')
    .filter((site: string) => site.trim() !== '')
    .map((site: string) => site.replace("*.", '').trim());
  await browser.storage.local.set({ whitelist: sites })
  loadWhitelist();
  textarea.textContent = '';
});

async function loadWhitelist() {
  let whitelist = await browser.storage.local.get(['whitelist'])
  whitelist = whitelist.whitelist || [];
  whitelistItems.innerHTML = '';
  whitelist.forEach((site: string) => {
    const li = document.createElement('li');
    li.textContent = site;
    whitelistItems.appendChild(li);
  });
}

form.addEventListener('reset', async (e) => {
  e.preventDefault(); // Prevent immediate reset
  if (confirm('Are you sure you want to clear the entire whitelist?')) {
    await browser.storage.local.set({ whitelist: [] })
    loadWhitelist();
    textarea.value = '';
  }
});
