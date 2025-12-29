chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_CURRENT_URL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        sendResponse({ url: tabs[0].url });
      } else {
        // Handle cases where URL is not available (e.g., new tab page)
        sendResponse({ url: '' });
      }
    });
    return true; // Indicates that the response is sent asynchronously
  }

  if (request.action === 'FILL_CREDENTIALS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'FILL_CREDENTIALS',
          username: request.username,
          password: request.password,
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Could not send message to content script:", chrome.runtime.lastError.message);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true, ...response });
          }
        });
      }
    });
    return true; // Indicates that the response is sent asynchronously
  }

  if (request.action === 'LOGIN_FORM_DETECTED') {
    // This action can be used to show a badge on the extension icon in the future.
    // For now, we'll just log it for debugging purposes.
    console.log('Login form detected on:', request.url);
  }
});
