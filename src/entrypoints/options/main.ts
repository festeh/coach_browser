const form = document.getElementById('whitelistForm')! as HTMLFormElement;
const textarea = document.getElementById('whitelistSites')! as HTMLTextAreaElement;
const whitelistItems = document.getElementById('whitelistItems')! as HTMLUListElement;

// Redirect URL elements
const redirectForm = document.getElementById('redirectForm')! as HTMLFormElement;
const redirectInput = document.getElementById('redirectUrl')! as HTMLInputElement;
const redirectError = document.getElementById('redirectError')! as HTMLParagraphElement;
const clearRedirectBtn = document.getElementById('clearRedirect')! as HTMLButtonElement;

// URL validation - empty string is considered valid to allow clearing the redirect URL
function isValidUrl(string: string): boolean {
  if (!string) return true;
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Load redirect URL on page load
async function loadRedirectUrl() {
  const { redirect_url = '' } = await browser.storage.local.get(['redirect_url']);
  if (redirect_url) {
    redirectInput.value = redirect_url;
  }
}

// Handle redirect form submission
redirectForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = redirectInput.value.trim();

  if (!isValidUrl(url)) {
    redirectError.textContent = 'Please enter a valid URL (must start with http:// or https://)';
    redirectError.style.display = 'block';
    return;
  }

  redirectError.style.display = 'none';
  await browser.storage.local.set({ redirect_url: url });
});

// Handle clear button
clearRedirectBtn.addEventListener('click', async () => {
  redirectInput.value = '';
  redirectError.style.display = 'none';
  await browser.storage.local.set({ redirect_url: '' });
});

// Copy whitelist button
const copyWhitelistBtn = document.getElementById('copyWhitelist')! as HTMLButtonElement;
copyWhitelistBtn.addEventListener('click', async () => {
  const { whitelist = [] } = await browser.storage.local.get(['whitelist']);
  const text = whitelist.join('\n');
  await navigator.clipboard.writeText(text);

  // Brief feedback
  const originalText = copyWhitelistBtn.textContent;
  copyWhitelistBtn.textContent = 'Copied!';
  setTimeout(() => {
    copyWhitelistBtn.textContent = originalText;
  }, 1500);
});

// Load current whitelist on page load
document.addEventListener('DOMContentLoaded', () => {
  loadWhitelist();
  loadRedirectUrl();
});

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  const newSites = (textarea.value || '').split('\n')
    .filter((site: string) => site.trim() !== '')
    .map((site: string) => site.replace("*.", '').trim());
  
  const { whitelist = [] } = await browser.storage.local.get(['whitelist']);
  const updatedWhitelist = [...new Set([...whitelist, ...newSites])];
  
  await browser.storage.local.set({ whitelist: updatedWhitelist });
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
