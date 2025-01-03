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
    removeButton.innerHTML = `<svg class="remove-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>`;
    
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
