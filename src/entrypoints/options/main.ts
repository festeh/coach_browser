const form = document.getElementById('whitelistForm')!;
const textarea = document.getElementById('whitelistSites')!;
const whitelistItems = document.getElementById('whitelistItems')!;

// Load current whitelist on page load
document.addEventListener('DOMContentLoaded', loadWhitelist);

form.addEventListener('submit', function (e) {
  e.preventDefault();
  const sites = textarea.value.split('\n').filter(site => site.trim() !== '');
  browser.storage.local.set({ whitelist: sites }, function () {
    console.log('Whitelist saved');
    loadWhitelist();
    textarea.value = '';
  });
});

function loadWhitelist() {
  browser.storage.local.get(['whitelist'], function (result) {
    const whitelist = result.whitelist || [];
    whitelistItems.innerHTML = '';
    whitelist.forEach(site => {
      const li = document.createElement('li');
      li.textContent = site;
      whitelistItems.appendChild(li);
    });
  });
}
