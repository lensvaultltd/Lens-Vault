// Lens Vault Popup - Supabase Integration
console.log('Lens Vault popup initializing...');

let currentUrl = '';
let allCredentials = [];

init();

async function init() {
  chrome.runtime.sendMessage({ action: 'GET_CURRENT_URL' }, (response) => {
    if (response?.url) {
      currentUrl = response.url;
      setStatus(`On ${getDomainFromUrl(response.url)}`);
      loadCredentials();
    } else {
      loadCredentials();
    }
  });
}

function loadCredentials() {
  setStatus('Loading vault...');

  // Get vault from Supabase via background script
  chrome.runtime.sendMessage({ action: 'GET_VAULT' }, (response) => {
    if (response?.success && response.entries) {
      allCredentials = response.entries;
      displayCredentials(allCredentials);
      updateStatusCount();
    } else {
      setStatus('Failed to load vault');
      displayCredentials([]);
    }
  });
}

function displayCredentials(credentials) {
  const listElement = document.getElementById('credentialsList');

  if (credentials.length === 0) {
    listElement.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔐</div>
        <div class="empty-title">No Passwords Yet</div>
        <div class="empty-text">
          Log in to websites and we'll offer to save your passwords securely in your vault
        </div>
      </div>
    `;
    return;
  }

  let displayItems = credentials;
  if (currentUrl) {
    try {
      const currentDomain = new URL(currentUrl).hostname;
      const matches = credentials.filter(c => {
        try {
          const credDomain = new URL(c.website).hostname;
          return credDomain.includes(currentDomain) || currentDomain.includes(credDomain);
        } catch {
          return c.website.includes(currentDomain);
        }
      });

      if (matches.length > 0) {
        displayItems = matches;
      }
    } catch (e) {
      // Invalid URL
    }
  }

  listElement.innerHTML = displayItems.map(cred => `
    <div class="credential-item" data-id="${cred.id}">
      <div class="credential-icon">🔑</div>
      <div class="credential-info">
        <div class="credential-name">${cred.name || getDomainFromUrl(cred.website)}</div>
        <div class="credential-username">${cred.username || 'No username'}</div>
      </div>
      <div class="credential-arrow">→</div>
    </div>
  `).join('');

  document.querySelectorAll('.credential-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      const credential = credentials.find(c => c.id === id);
      if (credential) {
        fillCredentials(credential);
      }
    });
  });
}

function getDomainFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function fillCredentials(credential) {
  setStatus('Filling...');

  chrome.runtime.sendMessage({
    action: 'FILL_CREDENTIALS',
    username: credential.username,
    password: credential.password_encrypted
  }, (response) => {
    if (response?.success) {
      setStatus('✓ Filled successfully');
      setTimeout(() => window.close(), 500);
    } else {
      setStatus('✗ Failed to fill');
      setTimeout(() => updateStatusCount(), 2000);
    }
  });
}

function setStatus(message) {
  document.getElementById('statusText').textContent = message;
}

function updateStatusCount() {
  const count = allCredentials.length;
  setStatus(`${count} password${count !== 1 ? 's' : ''} in vault`);
}

document.getElementById('searchBox').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();

  if (!query) {
    displayCredentials(allCredentials);
    return;
  }

  const filtered = allCredentials.filter(c =>
    (c.username && c.username.toLowerCase().includes(query)) ||
    (c.name && c.name.toLowerCase().includes(query)) ||
    c.website.toLowerCase().includes(query)
  );

  displayCredentials(filtered);
});

console.log('Lens Vault popup ready ✓');
