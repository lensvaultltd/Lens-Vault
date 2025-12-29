// Listen for messages from the extension popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FILL_CREDENTIALS') {
    fillCredentials(request.username, request.password);
  }
});

// Function to fill credentials into login forms
function fillCredentials(username, password) {
  // Find username/email fields
  const usernameFields = document.querySelectorAll(
    'input[type="text"], input[type="email"]'
  );
  const passwordFields = document.querySelectorAll('input[type="password"]');

  // Try to find the most likely username field
  let usernameField = Array.from(usernameFields).find((field) => {
    const fieldName = field.name.toLowerCase();
    return (
      fieldName.includes('user') ||
      fieldName.includes('email') ||
      fieldName.includes('login') ||
      field.id.toLowerCase().includes('username') ||
      field.id.toLowerCase().includes('email')
    );
  });

  // If no specific username field found, use the first text/email input
  if (!usernameField && usernameFields.length > 0) {
    usernameField = usernameFields[0];
  }

  // Get the first password field
  const passwordField = passwordFields.length > 0 ? passwordFields[0] : null;

  // Fill in the fields if found
  if (usernameField) {
    usernameField.value = username;
    usernameField.dispatchEvent(new Event('input', { bubbles: true }));
    usernameField.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (passwordField) {
    passwordField.value = password;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    passwordField.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// Detect login forms and notify the extension
function detectLoginForm() {
  const hasPasswordField =
    document.querySelector('input[type="password"]') !== null;
  const hasUsernameField =
    document.querySelector('input[type="text"], input[type="email"]') !== null;

  if (hasPasswordField && hasUsernameField) {
    chrome.runtime.sendMessage({
      action: 'LOGIN_FORM_DETECTED',
      url: window.location.href,
    });
  }
}

// Run detection when page loads and when DOM changes
detectLoginForm();

const observer = new MutationObserver(() => {
  detectLoginForm();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
