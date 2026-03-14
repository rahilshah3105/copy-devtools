// Background service worker for the extension
// Handles clipboard operations and message passing

console.log('Network & WebSocket Copy Pro - Background Service Worker Loaded');

const MAX_WS_EVENTS_PER_TAB = 5000;
const MAX_CONSOLE_LOGS_PER_TAB = 10000;

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result || {}));
  });
}

function setStorage(value) {
  return new Promise((resolve) => {
    chrome.storage.local.set(value, () => resolve());
  });
}

async function appendWebSocketEvent(tabId, eventData) {
  if (!tabId || !eventData) return;

  const storage = await getStorage(['wsEventsByTab']);
  const wsEventsByTab = storage.wsEventsByTab || {};
  const key = String(tabId);
  const current = Array.isArray(wsEventsByTab[key]) ? wsEventsByTab[key] : [];

  current.push(eventData);
  if (current.length > MAX_WS_EVENTS_PER_TAB) {
    wsEventsByTab[key] = current.slice(-Math.floor(MAX_WS_EVENTS_PER_TAB * 0.8));
  } else {
    wsEventsByTab[key] = current;
  }

  await setStorage({ wsEventsByTab });
}

async function appendConsoleLogEvent(tabId, eventData) {
  if (!tabId || !eventData) return;

  const storage = await getStorage(['consoleLogsByTab']);
  const consoleLogsByTab = storage.consoleLogsByTab || {};
  const key = String(tabId);
  const current = Array.isArray(consoleLogsByTab[key]) ? consoleLogsByTab[key] : [];

  current.push(eventData);
  if (current.length > MAX_CONSOLE_LOGS_PER_TAB) {
    consoleLogsByTab[key] = current.slice(-Math.floor(MAX_CONSOLE_LOGS_PER_TAB * 0.8));
  } else {
    consoleLogsByTab[key] = current;
  }

  await setStorage({ consoleLogsByTab });
}

// Listen for messages from DevTools or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'relayToContentScript') {
    chrome.tabs.sendMessage(message.tabId, { action: message.action }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse(response || { success: false, error: 'No response from content script' });
      }
    });
    return true;
  }

  if (message.type === 'websocketEvent') {
    const senderTabId = sender && sender.tab ? sender.tab.id : null;
    const event = {
      ...(message.data || {}),
      tabId: senderTabId,
      capturedAt: new Date().toISOString()
    };

    appendWebSocketEvent(senderTabId, event)
      .then(() => {
        // Forward in real-time for any open panel listeners.
        chrome.runtime.sendMessage({
          type: 'websocketEvent',
          data: event,
          tabId: senderTabId
        }, () => {
          void chrome.runtime.lastError;
        });
        sendResponse({ success: true });
      })
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true;
  }

  if (message.type === 'consoleLogEvent') {
    const senderTabId = sender && sender.tab ? sender.tab.id : null;
    const event = {
      ...(message.data || {}),
      tabId: senderTabId
    };

    appendConsoleLogEvent(senderTabId, event)
      .then(() => {
        chrome.runtime.sendMessage({
          type: 'consoleLogEvent',
          data: event,
          tabId: senderTabId
        }, () => void chrome.runtime.lastError);
        sendResponse({ success: true });
      })
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true;
  }

  if (message.type === 'getWsEvents') {
    const tabId = message.tabId;
    getStorage(['wsEventsByTab'])
      .then((storage) => {
        const wsEventsByTab = storage.wsEventsByTab || {};
        const events = Array.isArray(wsEventsByTab[String(tabId)])
          ? wsEventsByTab[String(tabId)]
          : [];
        sendResponse({ success: true, events });
      })
      .catch((error) => sendResponse({ success: false, error: error.message, events: [] }));

    return true;
  }

  if (message.type === 'getConsoleEvents') {
    const tabId = message.tabId;
    getStorage(['consoleLogsByTab'])
      .then((storage) => {
        const consoleLogsByTab = storage.consoleLogsByTab || {};
        const events = Array.isArray(consoleLogsByTab[String(tabId)])
          ? consoleLogsByTab[String(tabId)]
          : [];
        sendResponse({ success: true, events });
      })
      .catch((error) => sendResponse({ success: false, error: error.message, events: [] }));

    return true;
  }

  if (message.type === 'clearWsEvents') {
    const tabId = message.tabId;
    getStorage(['wsEventsByTab', 'consoleLogsByTab'])
      .then(async (storage) => {
        const wsEventsByTab = storage.wsEventsByTab || {};
        const consoleLogsByTab = storage.consoleLogsByTab || {};
        delete wsEventsByTab[String(tabId)];
        delete consoleLogsByTab[String(tabId)];
        await setStorage({ wsEventsByTab, consoleLogsByTab });
        sendResponse({ success: true });
      })
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true;
  }

  if (message.type === 'copyToClipboard') {
    // Handle clipboard copy from content script (fallback)
    copyToClipboard(message.data)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'getStoredData') {
    // Retrieve stored data if needed
    chrome.storage.local.get(['networkData', 'wsData'], (result) => {
      sendResponse(result);
    });
    return true;
  }
});

// Copy data to clipboard
async function copyToClipboard(text) {
  try {
    // Note: In Manifest V3, clipboard API has limited support in service workers
    // The actual clipboard write is handled in the panel/popup context
    console.log('Clipboard operation requested');
    return true;
  } catch (error) {
    console.error('Clipboard error:', error);
    throw error;
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Network & WebSocket Copy Pro installed');
    
    // Open welcome page
    chrome.tabs.create({
      url: 'popup.html'
    });
  } else if (details.reason === 'update') {
    console.log('Network & WebSocket Copy Pro updated');
  }
});

// Keep service worker alive
// In Manifest V3, service workers can be terminated after 30 seconds of inactivity
// This is normal behavior and the worker will restart when needed
let keepAliveInterval;

function keepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // This just keeps the service worker active
    });
  }, 20000); // Every 20 seconds
}

keepAlive();
