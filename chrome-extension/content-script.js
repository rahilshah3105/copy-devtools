// Content script - Runs in the context of web pages
// Can access page's window object including Redux store

// console.log('DevTools Data Exporter - Content Script Loaded');

// Bridge WebSocket and Console events emitted from MAIN world hook script to extension runtime.
window.addEventListener('message', (event) => {
    try {
        if (event.source !== window || !event.data) return;
        const payload = event.data;
        
        if (payload.source === 'DEVTOOLS_WS_HOOK' && payload.data) {
            try {
                chrome.runtime.sendMessage({
                    type: 'websocketEvent',
                    data: {
                        ...payload.data,
                        pageUrl: window.location.href,
                        pageOrigin: window.location.origin
                    }
                }, () => void chrome.runtime.lastError);
            } catch (e) {
                if (e.message && String(e.message).includes('Extension context invalidated')) {
                    console.debug('DevTools Data Exporter: Extension reloaded. Please refresh the page.');
                }
            }
        }
        
        if (payload.source === 'DEVTOOLS_CONSOLE_HOOK' && payload.data) {
            try {
                chrome.runtime.sendMessage({
                    type: 'consoleLogEvent',
                    data: {
                        ...payload.data,
                        pageUrl: window.location.href,
                        pageOrigin: window.location.origin
                    }
                }, () => void chrome.runtime.lastError);
            } catch (e) {}
        }
    } catch (error) {
        // Ignore errors
    }
});

// Listen for messages from DevTools panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getPageData') {
        collectPageData(message.dataType).then(data => {
            sendResponse({ success: true, data });
        });
        return true;
    }

    if (message.action === 'getReduxState') {
        const requestId = Date.now().toString() + Math.random().toString();

        // Set a timeout to resolve if we don't hear back from page-hook.js
        let responded = false;
        const timeout = setTimeout(() => {
            if (!responded) {
                window.removeEventListener('message', listener);
                responded = true;
                // Fallback (might be empty/unavailable in Isolated World)
                sendResponse({ success: true, data: getReduxState() });
            }
        }, 1500);

        const listener = (event) => {
            if (event.source !== window || !event.data) return;
            if (event.data.source === 'DEVTOOLS_REDUX_RESPONSE' && event.data.requestId === requestId) {
                window.removeEventListener('message', listener);
                if (!responded) {
                    responded = true;
                    clearTimeout(timeout);
                    sendResponse({ success: true, data: event.data.data });
                }
            }
        };

        window.addEventListener('message', listener);

        // Trigger request to MAIN world
        window.postMessage({
            action: 'DEVTOOLS_GET_REDUX_STATE',
            requestId: requestId
        }, '*');

        return true; // Keep message channel open for async sendResponse
    }

    if (message.action === 'getApplicationData') {
        getApplicationData().then(appData => {
            sendResponse({ success: true, data: appData });
        });
        return true; // Keep message channel open for async sendResponse
    }

    if (message.action === 'getDOMContent') {
        const domData = getDOMContent();
        sendResponse({ success: true, data: domData });
        return true;
    }
});

// Collect various types of page data
async function collectPageData(dataType) {
    try {
        switch (dataType) {
            case 'redux':
                return getReduxState();
            case 'application':
                return await getApplicationData();
            case 'dom':
                return getDOMContent();
            case 'all':
                return {
                    redux: getReduxState(),
                    application: await getApplicationData(),
                };
            default:
                return null;
        }
    } catch (error) {
        console.error('Error collecting page data:', error);
        return { error: error.message };
    }
}

// Get Redux state (multiple methods for compatibility)
function getReduxState() {
    try {
        const reduxData = {
            available: false,
            state: null,
            method: null
        };

        // Method 1: Check Redux DevTools Extension
        if (window.__REDUX_DEVTOOLS_EXTENSION__) {
            try {
                const extension = window.__REDUX_DEVTOOLS_EXTENSION__;
                reduxData.available = true;
                reduxData.method = 'Redux DevTools Extension';
                // Note: The extension API doesn't directly expose state, but we mark it as available
            } catch (e) {
                console.log('Redux DevTools found but cannot access:', e);
            }
        }

        // Method 2: Check for exposed store on window
        if (window.store && typeof window.store.getState === 'function') {
            try {
                reduxData.state = window.store.getState();
                reduxData.available = true;
                reduxData.method = 'window.store';
            } catch (e) {
                console.log('Store found but cannot get state:', e);
            }
        }

        // Method 3: Check common Redux store locations
        const commonStoreNames = ['__store__', '_store', 'reduxStore', 'Store'];
        for (const name of commonStoreNames) {
            if (window[name] && typeof window[name].getState === 'function') {
                try {
                    reduxData.state = window[name].getState();
                    reduxData.available = true;
                    reduxData.method = `window.${name}`;
                    break;
                } catch (e) {
                    // Continue to next method
                }
            }
        }

        // Method 4: Try to access React's internal instance
        if (!reduxData.state && typeof window.React !== 'undefined') {
            try {
                // Look for React DevTools hook
                if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                    reduxData.method = 'React DevTools detected (state extraction requires additional setup)';
                }
            } catch (e) {
                // Silent fail
            }
        }

        return reduxData;
    } catch (error) {
        return { error: error.message, available: false };
    }
}

// Get Application tab data (localStorage, sessionStorage, cookies, caches, indexedDB)
async function getApplicationData() {
    try {
        const data = {
            localStorage: {},
            sessionStorage: {},
            cookies: document.cookie,
            caches: {},
            indexedDB: [],
            url: window.location.href,
            timestamp: new Date().toISOString()
        };

        // Get localStorage
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                data.localStorage[key] = localStorage.getItem(key);
            }
        } catch (e) {
            data.localStorage = { error: 'Cannot access localStorage: ' + e.message };
        }

        // Get sessionStorage
        try {
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                data.sessionStorage[key] = sessionStorage.getItem(key);
            }
        } catch (e) {
            data.sessionStorage = { error: 'Cannot access sessionStorage: ' + e.message };
        }

        // Get Caches
        try {
            if ('caches' in window) {
                const cacheKeys = await window.caches.keys();
                for (const cacheName of cacheKeys) {
                    const cache = await window.caches.open(cacheName);
                    const requests = await cache.keys();
                    data.caches[cacheName] = requests.map(req => req.url);
                }
            }
        } catch (e) {
            data.caches = { error: 'Cannot access caches: ' + e.message };
        }

        // Get IndexedDB references
        try {
            if ('indexedDB' in window && window.indexedDB.databases) {
                const dbs = await window.indexedDB.databases();
                data.indexedDB = dbs;
            }
        } catch (e) {
            data.indexedDB = [{ error: 'Cannot access indexedDB: ' + e.message }];
        }

        return data;
    } catch (error) {
        return { error: error.message };
    }
}

// Get DOM content
function getDOMContent() {
    try {
        return {
            html: document.documentElement.outerHTML,
            title: document.title,
            url: window.location.href,
            doctype: document.doctype ? document.doctype.name : 'html',
            characterSet: document.characterSet,
            readyState: document.readyState
        };
    } catch (error) {
        return { error: error.message };
    }
}

/*
// Removed to comply with Content Security Policy (CSP)
// This function was causing CSP violations on strict websites

// Inject script to access Redux from page context (advanced method)
function injectReduxAccessor() {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      window.__DEVTOOLS_EXPORTER__ = {
        getReduxState: function() {
          // Try multiple methods to access Redux
          if (window.store && typeof window.store.getState === 'function') {
            return window.store.getState();
          }
          if (window.__store__ && typeof window.__store__.getState === 'function') {
            return window.__store__.getState();
          }
          return null;
        }
      };
    })();
  `;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}
*/

// CSP-friendly approach: Don't inject scripts, rely on user's manual exposure
// Users should add: window.store = store; in their Redux setup
// See REDUX_SETUP_GUIDE.md for instructions
