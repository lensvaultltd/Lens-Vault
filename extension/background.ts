/// <reference types="chrome"/>
import { vaultService } from './lib/extension-supabase';

// Initialize vault service
vaultService.init().catch((err) => console.error('Vault init failed:', err));

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Get current tab URL
    if (request.action === 'GET_CURRENT_URL') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.url) {
                sendResponse({ url: tabs[0].url });
            } else {
                sendResponse({ url: '' });
            }
        });
        return true;
    }

    // Fill credentials
    if (request.action === 'FILL_CREDENTIALS') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    {
                        action: 'FILL_CREDENTIALS',
                        username: request.username,
                        password: request.password,
                    },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.warn('Could not send message:', chrome.runtime.lastError.message);
                            sendResponse({ success: false, error: chrome.runtime.lastError.message });
                        } else {
                            sendResponse({ success: true, ...response });
                        }
                    }
                );
            }
        });
        return true;
    }

    // Save new credential
    if (request.action === 'SAVE_CREDENTIAL') {
        vaultService
            .saveCredential(request.website, request.username, request.password)
            .then((result) => {
                sendResponse(result);

                // Show success badge
                if (result.success) {
                    showSuccessBadge();
                }
            })
            .catch((err) => {
                sendResponse({ success: false, error: String(err) });
            });
        return true;
    }

    // Update existing credential
    if (request.action === 'UPDATE_CREDENTIAL') {
        vaultService
            .updateCredential(request.id, request.password)
            .then((result) => {
                sendResponse(result);

                if (result.success) {
                    showSuccessBadge();
                }
            })
            .catch((err) => {
                sendResponse({ success: false, error: String(err) });
            });
        return true;
    }

    // Content script ready
    if (request.action === 'CONTENT_SCRIPT_READY') {
        // Send current vault to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                const domain = new URL(request.url || '').hostname;
                const entries = vaultService.getEntriesByDomain(domain);

                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'VAULT_UPDATED',
                    entries,
                });
            }
        });
    }
});

/**
 * Show success badge on extension icon
 */
function showSuccessBadge() {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });

    setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
    }, 2000);
}

/**
 * Handle extension icon click
 */
chrome.action.onClicked.addListener(() => {
    // Open popup (handled automatically by manifest)
});
