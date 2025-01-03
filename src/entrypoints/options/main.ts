const form = document.getElementById('whitelistForm')!;
const textarea = document.getElementById('whitelistSites')!;
const whitelistItems = document.getElementById('whitelistItems')!;

// Load current whitelist on page load
document.addEventListener('DOMContentLoaded', loadWhitelist);

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  const sites = (textarea.value || '').split('\n')
    .filter((site: string) => site.trim() !== '')
    .map((site: string) => site.replace("*.", '').trim());
  
  await browser.storage.local.set({ whitelist: sites });
  loadWhitelist();
  textarea.value = '';
});

async function loadWhitelist() {
  const { whitelist = [] } = await browser.storage.local.get(['whitelist']);
  whitelistItems.innerHTML = '';
  
  whitelist.forEach((site: string) => {
    const li = document.createElement('li');
    li.className = 'whitelist-item';
    
    const siteText = document.createElement('span');
    siteText.textContent = site;
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-button';
    removeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="remove-icon"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
    
    removeButton.addEventListener('click', async () => {
      const { whitelist = [] } = await browser.storage.local.get(['whitelist']);
      const updatedWhitelist = whitelist.filter((item: string) => item !== site);
      await browser.storage.local.set({ whitelist: updatedWhitelist });
      loadWhitelist();
    });

    li.appendChild(siteText);
    li.appendChild(removeButton);
    whitelistItems.appendChild(li);
  });
}

form.addEventListener('reset', async (e) => {
  e.preventDefault();
  if (confirm('Are you sure you want to clear the entire whitelist?')) {
    await browser.storage.local.set({ whitelist: [] });
    loadWhitelist();
    textarea.value = '';
  }
});
