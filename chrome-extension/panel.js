// Setup visible debugging
function logToUI(msg, isError = false) {
    const container = document.getElementById('debugLogs');
    if (!container) return;
    const div = document.createElement('div');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    if (isError) div.style.color = 'var(--status-error-text)';
    else if (msg.includes('WebSocket') || msg.includes('ws://') || msg.includes('wss://')) div.style.color = 'var(--heading-color)';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = function (...args) {
        originalLog.apply(console, args);
        logToUI(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    };
    console.warn = function (...args) {
        originalWarn.apply(console, args);
        logToUI('WARN: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), true);
    };
    console.error = function (...args) {
        originalError.apply(console, args);
        logToUI('ERROR: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), true);
    };

    document.getElementById('clearDebugBtn')?.addEventListener('click', () => {
        const container = document.getElementById('debugLogs');
        if (container) container.innerHTML = '';
    });

    console.log("✅ DevTools Data Exporter Panel.js loaded");

    // Store captured network data
    let networkRequests = [];
    let webSocketMessages = [];
    let webSocketConnections = []; // Track WebSocket connections
    let consoleLogs = [];
    let tabId = null;
    let debuggerAttached = false;

    // Maximum storage limits for safety
    const MAX_REQUESTS = 10000;
    const MAX_WS_MESSAGES = 5000;
    const MAX_CONSOLE_LOGS = 10000;

    // Get the inspected tab ID (it's a direct property, not via eval)
    tabId = chrome.devtools.inspectedWindow.tabId;
    console.log("✅ Inspected tab ID:", tabId);
    console.log("🔄 Extension ready - capturing network and WebSocket data...");

    // Note: We use Network API instead of Debugger API to avoid Chrome's "debugging" popup
    // This captures WebSocket connections (URLs, headers, timing) but not individual message frames
    console.log("📝 Using Network API for non-intrusive capture (no browser popup!)");

    // Load existing network data (including WebSocket connections established before panel opened)
    loadExistingNetworkData();

    // Load queued WebSocket events captured by background/content-script before panel opened.
    loadQueuedWebSocketEvents();
    loadQueuedConsoleEvents();

    // Capture console logs from DevTools (if available, mostly deprecated)
    if (chrome.devtools && chrome.devtools.console && chrome.devtools.console.onMessageAdded) {
        chrome.devtools.console.onMessageAdded.addListener((message) => {
            if (consoleLogs.length >= MAX_CONSOLE_LOGS) {
                consoleLogs = consoleLogs.slice(-Math.floor(MAX_CONSOLE_LOGS * 0.8));
            }
            consoleLogs.push({
                level: message.level || 'log',
                text: message.text || '',
                source: message.source || 'console',
                url: message.url || '',
                line: message.line || '',
                timestamp: new Date().toISOString()
            });
            updateStats();
        });
    }

    // Robust copy to clipboard helper for DevTools environment
    async function copyToClipboard(text) {
        try {
            // First try modern async API, requires document to be focused
            if (document.hasFocus && document.hasFocus() && navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return;
            }
            throw new Error('Not focused or Modern API unavailable');
        } catch (err) {
            // Fallback for DevTools context whenever the user clicked but the iframe isn't fully focused
            return new Promise((resolve, reject) => {
                try {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    // Prevent scrolling and ensure it's out of viewport
                    textarea.style.position = 'fixed';
                    textarea.style.top = '-9999px';
                    textarea.style.left = '-9999px';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    
                    textarea.select();
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textarea);
                    
                    if (successful) {
                        resolve();
                    } else {
                        reject(new Error('execCommand("copy") failed'));
                    }
                } catch (fallbackErr) {
                    reject(fallbackErr);
                }
            });
        }
    }

    // Sanitize text to prevent XSS
    function sanitizeText(text) {
        if (typeof text !== 'string') return String(text);
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getHeaderValue(headers, headerName) {
        if (!headers || !headerName) return '';
        const target = String(headerName).toLowerCase();

        if (Array.isArray(headers)) {
            const found = headers.find((h) => h && h.name && String(h.name).toLowerCase() === target);
            return found && found.value ? String(found.value) : '';
        }

        if (typeof headers === 'object') {
            for (const [key, value] of Object.entries(headers)) {
                if (String(key).toLowerCase() === target) {
                    return String(value);
                }
            }
        }

        return '';
    }

    function isLikelyWebSocketRequest(entry) {
        if (!entry) return false;

        const url = entry.request?.url || entry.url || '';
        const resourceType = String(entry._resourceType || entry.type || '').toLowerCase();
        const status = entry.response?.status;
        const reqHeaders = entry.request?.headers || entry.headers || [];
        const resHeaders = entry.response?.headers || [];

        const reqUpgrade = getHeaderValue(reqHeaders, 'upgrade').toLowerCase();
        const resUpgrade = getHeaderValue(resHeaders, 'upgrade').toLowerCase();
        const wsKey = getHeaderValue(reqHeaders, 'sec-websocket-key');
        const wsVersion = getHeaderValue(reqHeaders, 'sec-websocket-version');
        const wsAccept = getHeaderValue(resHeaders, 'sec-websocket-accept');

        return (
            resourceType.includes('websocket') ||
            resourceType === 'socket' ||
            url.startsWith('ws://') ||
            url.startsWith('wss://') ||
            /\/ws(\/|\?|$)/i.test(url) ||
            status === 101 ||
            reqUpgrade === 'websocket' ||
            resUpgrade === 'websocket' ||
            !!wsKey ||
            !!wsVersion ||
            !!wsAccept
        );
    }

    function pushWebSocketEntry(entry) {
        if (webSocketMessages.length >= MAX_WS_MESSAGES) {
            webSocketMessages = webSocketMessages.slice(-Math.floor(MAX_WS_MESSAGES * 0.8));
        }

        webSocketMessages.push(entry);
    }

    // Load existing network data from HAR (HTTP Archive)
    // This captures WebSocket connections that were established BEFORE the panel was opened
    async function loadExistingNetworkData() {
        try {
            console.log('🔄 Loading existing network data (including WebSockets)...');

            chrome.devtools.network.getHAR((harLog) => {
                if (!harLog || !harLog.entries) {
                    console.log('⚠️ No HAR data available');
                    return;
                }

                console.log(`📊 Found ${harLog.entries.length} network entries in HAR`);

                let wsCount = 0;
                harLog.entries.forEach((entry) => {
                    // Check if it's a WebSocket connection
                    const isWebSocket = isLikelyWebSocketRequest(entry);

                    if (isWebSocket) {
                        wsCount++;
                        const url = entry.request?.url || '';
                        console.log('✅ Found existing WebSocket connection:', url);

                        // Add to WebSocket messages
                        pushWebSocketEntry({
                            url: url,
                            resourceType: entry._resourceType || 'websocket',
                            timestamp: entry.startedDateTime || new Date().toISOString(),
                            request: entry.request,
                            response: entry.response,
                            time: entry.time,
                            serverIPAddress: entry.serverIPAddress,
                            connection: entry.connection,
                            _fromHAR: true
                        });
                    }

                    // Also add to regular network requests if not already there
                    if (networkRequests.length < MAX_REQUESTS) {
                        networkRequests.push({
                            request: entry.request,
                            response: entry.response,
                            _resourceType: entry._resourceType,
                            time: entry.time,
                            _fromHAR: true
                        });
                    }
                });

                console.log(`✅ Loaded ${wsCount} existing WebSocket connections from HAR`);
                console.log(`📊 Total WebSocket count: ${webSocketMessages.length}`);
                updateStats();
            });
        } catch (error) {
            console.error('❌ Error loading existing network data:', error);
        }
    }

    // Listen for network requests from devtools.js
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
            if (message && message.type === 'networkRequest' && message.data) {
                console.log('📥 Network request received:', message.data.request?.url);
                processNetworkRequest(message.data);
                return;
            }

            if (message && message.type === 'websocketEvent' && message.data) {
                if (message.tabId && tabId && message.tabId !== tabId) {
                    return;
                }
                processWebSocketEvent(message.data);
                return;
            }

            if (message && message.type === 'consoleLogEvent' && message.data) {
                if (message.tabId && tabId && message.tabId !== tabId) {
                    return;
                }
                if (consoleLogs.length >= MAX_CONSOLE_LOGS) {
                    consoleLogs = consoleLogs.slice(-Math.floor(MAX_CONSOLE_LOGS * 0.8));
                }
                consoleLogs.push({
                    level: message.data.level || 'log',
                    text: message.data.text || '',
                    source: message.data.source || 'console',
                    url: message.data.url || window.location.href,
                    line: message.data.line || '',
                    timestamp: message.data.timestamp || new Date().toISOString(),
                    count: 1
                });
                updateStats();
                return;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    async function loadQueuedWebSocketEvents() {
        try {
            if (!tabId) return;

            const response = await chrome.runtime.sendMessage({
                type: 'getWsEvents',
                tabId
            });

            if (!response || !response.success || !Array.isArray(response.events)) {
                return;
            }

            response.events.forEach((event) => {
                processWebSocketEvent(event);
            });

            if (response.events.length > 0) {
                console.log(`✅ Loaded ${response.events.length} queued WebSocket events from background`);
            }
        } catch (error) {
            console.error('Error loading queued WebSocket events:', error);
        }
    }

    async function loadQueuedConsoleEvents() {
        try {
            if (!tabId) return;

            const response = await chrome.runtime.sendMessage({
                type: 'getConsoleEvents',
                tabId
            });

            if (!response || !response.success || !Array.isArray(response.events)) {
                return;
            }

            response.events.forEach((event) => {
                if (consoleLogs.length >= MAX_CONSOLE_LOGS) {
                    consoleLogs = consoleLogs.slice(-Math.floor(MAX_CONSOLE_LOGS * 0.8));
                }
                consoleLogs.push({
                    level: event.level || 'log',
                    text: event.text || '',
                    source: event.source || 'console',
                    url: event.url || '',
                    line: event.line || '',
                    timestamp: event.timestamp || new Date().toISOString(),
                    count: 1
                });
            });

            if (response.events.length > 0) {
                console.log(`✅ Loaded ${response.events.length} queued console events from background`);
                updateStats();
            }
        } catch (error) {
            console.error('Error loading queued console events:', error);
        }
    }

    function processWebSocketEvent(eventData) {
        try {
            const entry = {
                source: 'page-hook',
                eventType: eventData.type || 'message',
                direction: eventData.direction || null,
                url: eventData.url || 'unknown',
                connectionId: eventData.connectionId || null,
                timestamp: eventData.timestamp || new Date().toISOString(),
                payload: eventData.data || null,
                protocol: eventData.protocol || '',
                extensions: eventData.extensions || '',
                code: eventData.code,
                reason: eventData.reason,
                wasClean: eventData.wasClean
            };

            pushWebSocketEntry(entry);
            updateStats();
        } catch (error) {
            console.error('Error processing WebSocket event:', error);
        }
    }

    // Process network request and categorize
    async function processNetworkRequest(request) {
        // Enforce storage limits to prevent memory issues
        if (networkRequests.length >= MAX_REQUESTS) {
            console.warn('Maximum request limit reached. Clearing oldest requests.');
            networkRequests = networkRequests.slice(-Math.floor(MAX_REQUESTS * 0.8));
        }

        try {
            networkRequests.push(request);

            // Check if it's a WebSocket - robust detection methods
            const url = request.request?.url || '';
            const resourceType = request._resourceType || request.type || '';
            const isWebSocket = isLikelyWebSocketRequest(request);

            console.log('🔍 Request check:', {
                url: url.substring(0, 50),
                resourceType,
                isWebSocket
            });

            if (isWebSocket) {
                console.log('✅ WebSocket detected!', url);

                // Add to WebSocket list
                pushWebSocketEntry({
                    url: url,
                    resourceType: resourceType,
                    timestamp: new Date().toISOString(),
                    request: request.request,
                    response: request.response
                });

                console.log('📊 WebSocket messages count:', webSocketMessages.length);
            }

            updateStats();
        } catch (error) {
            console.error('Error processing network request:', error);
        }
    }

    // Get WebSocket frames using DevTools API
    function getWebSocketFrames(request) {
        return new Promise((resolve, reject) => {
            try {
                if (request && typeof request.getContent === 'function') {
                    const timeout = setTimeout(() => {
                        reject(new Error('Timeout getting WebSocket frames'));
                    }, 5000);

                    request.getContent((content, encoding) => {
                        clearTimeout(timeout);
                        resolve(content);
                    });
                } else {
                    resolve(null);
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    // Update statistics display
    function updateStats() {
        try {
            const networkCountEl = document.getElementById('networkCount');
            const wsCountEl = document.getElementById('wsCount');
            const consoleCountEl = document.getElementById('consoleCount');
            const dataSizeEl = document.getElementById('dataSize');
            const wsNotice = document.getElementById('wsNotice');

            if (networkCountEl) networkCountEl.textContent = networkRequests.length;
            if (wsCountEl) wsCountEl.textContent = webSocketMessages.length;
            if (consoleCountEl) consoleCountEl.textContent = consoleLogs.length;

            // Show WebSocket notice when WebSocket data is detected
            if (wsNotice && webSocketMessages.length > 0) {
                wsNotice.style.display = 'block';
            }

            // Calculate total data size
            let totalSize = 0;
            networkRequests.forEach(req => {
                if (req && req.response && req.response.content) {
                    totalSize += req.response.content.size || 0;
                }
            });

            if (dataSizeEl) {
                const sizeInKB = (totalSize / 1024).toFixed(2);
                dataSizeEl.textContent = `${sizeInKB} KB`;
            }
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    // Copy all network requests to clipboard
    document.getElementById('copyAllNetwork').addEventListener('click', async () => {
        if (networkRequests.length === 0) {
            showStatus('No network requests captured yet. Reload the page with DevTools Network tab open.', 'error');
            return;
        }

        try {
            // Format network data for copying
            const formattedData = await formatNetworkRequests(networkRequests);

            // Copy to clipboard
            await copyToClipboard(formattedData);
            showStatus(`✅ Successfully copied ${networkRequests.length} network requests to clipboard!`, 'success');
        } catch (error) {
            console.error('Copy error:', error);
            const errorMsg = sanitizeText(error.message || String(error));
            showStatus(`❌ Error copying data: ${errorMsg}`, 'error');
        }
    });

    // Copy WebSocket messages to clipboard
    document.getElementById('copyWebSockets').addEventListener('click', async () => {
        if (webSocketMessages.length === 0) {
            showStatus('No WebSocket messages captured yet. Make sure WebSocket connections are active.', 'error');
            return;
        }

        try {
            const formattedData = formatWebSocketMessages(webSocketMessages);
            await copyToClipboard(formattedData);
            showStatus(`✅ Successfully copied ${webSocketMessages.length} WebSocket connections to clipboard!`, 'success');
        } catch (error) {
            console.error('Copy error:', error);
            const errorMsg = sanitizeText(error.message || String(error));
            showStatus(`❌ Error copying data: ${errorMsg}`, 'error');
        }
    });

    // Clear captured data
    document.getElementById('clearData').addEventListener('click', () => {
        networkRequests = [];
        webSocketMessages = [];
        consoleLogs = [];
        chrome.runtime.sendMessage({ type: 'clearWsEvents', tabId }, () => {
            void chrome.runtime.lastError;
        });
        updateStats();
        showStatus('🗑️ All captured data cleared', 'success');
    });

    // Helper to forward content-script requests via background service worker
    // Since DevTools panels don't have access to chrome.tabs API
    async function fetchPageDataFromBackground(action) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'relayToContentScript',
                tabId: tabId,
                action: action
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });
    }

    // Copy Application Data (localStorage, sessionStorage, cookies)
    document.getElementById('copyApplicationData').addEventListener('click', async () => {
        try {
            showStatus('📊 Collecting application data...', 'success');

            const response = await fetchPageDataFromBackground('getApplicationData');

            if (response && response.success) {
                const formattedData = formatApplicationData(response.data);
                await copyToClipboard(formattedData);
                showStatus('✅ Application data copied to clipboard!', 'success');
            } else {
                throw new Error(response?.error || 'Failed to get application data');
            }
        } catch (error) {
            console.error('Application data error:', error);
            showStatus(`❌ Error: ${sanitizeText(error.message || String(error))}. Make sure you're on a valid webpage.`, 'error');
        }
    });

    // Copy Redux State
    document.getElementById('copyReduxState').addEventListener('click', async () => {
        try {
            showStatus('⚛️ Checking for Redux state...', 'success');

            const response = await fetchPageDataFromBackground('getReduxState');

            if (response && response.success && response.data) {
                const formattedData = formatReduxState(response.data);
                await copyToClipboard(formattedData);
                showStatus('✅ Redux state copied to clipboard!', 'success');
            } else {
                throw new Error(response?.error || 'Redux state not found');
            }
        } catch (error) {
            console.error('Redux state error:', error);
            showStatus(`❌ Redux not found. Make sure Redux DevTools is installed or window.store is exposed.`, 'error');
        }
    });

    // Copy Console Logs
    document.getElementById('copyConsoleLogs').addEventListener('click', async () => {
        if (consoleLogs.length === 0) {
            showStatus('No console logs captured. Open Console tab and interact with the page.', 'error');
            return;
        }

        try {
            const formattedData = formatConsoleLogs(consoleLogs);
            await copyToClipboard(formattedData);
            showStatus(`✅ Copied ${consoleLogs.length} console logs to clipboard!`, 'success');
        } catch (error) {
            console.error('Console logs error:', error);
            showStatus(`❌ Error: ${sanitizeText(error.message || String(error))}`, 'error');
        }
    });

    // Copy DOM Content
    document.getElementById('copyDOMContent').addEventListener('click', async () => {
        try {
            showStatus('🌐 Extracting DOM content...', 'success');

            const response = await fetchPageDataFromBackground('getDOMContent');

            if (response && response.success) {
                const formattedData = formatDOMContent(response.data);
                await copyToClipboard(formattedData);
                showStatus('✅ DOM content copied to clipboard!', 'success');
            } else {
                throw new Error(response?.error || 'Failed to get DOM content');
            }
        } catch (error) {
            console.error('DOM content error:', error);
            showStatus(`❌ Error: ${sanitizeText(error.message || String(error))}`, 'error');
        }
    });

    // Copy EVERYTHING
    document.getElementById('copyEverything').addEventListener('click', async () => {
        try {
            showStatus('⭐ Collecting ALL data... This may take a moment...', 'success');

            let allData = {
                timestamp: new Date().toISOString(),
                url: window.location.href, // This might just show DevTools URL, actual URL is in DOM/App data
                sections: {}
            };

            // Network requests
            if (networkRequests.length > 0) {
                allData.sections.networkRequests = await formatNetworkRequests(networkRequests);
            }

            // WebSocket messages
            if (webSocketMessages.length > 0) {
                allData.sections.webSocketMessages = formatWebSocketMessages(webSocketMessages);
            }

            // Console logs
            if (consoleLogs.length > 0) {
                allData.sections.consoleLogs = formatConsoleLogs(consoleLogs);
            }

            // Application data
            try {
                const appResponse = await fetchPageDataFromBackground('getApplicationData');
                if (appResponse && appResponse.success) {
                    allData.sections.applicationData = formatApplicationData(appResponse.data);
                }
            } catch (e) {
                allData.sections.applicationData = 'Could not access application data: ' + e.message;
            }

            // Redux state
            try {
                const reduxResponse = await fetchPageDataFromBackground('getReduxState');
                if (reduxResponse && reduxResponse.success && reduxResponse.data) {
                    allData.sections.reduxState = formatReduxState(reduxResponse.data);
                }
            } catch (e) {
                allData.sections.reduxState = 'Redux state not available: ' + e.message;
            }

            // Format everything
            const finalOutput = formatEverything(allData);
            await copyToClipboard(finalOutput);

            showStatus('✅ EVERYTHING copied to clipboard! Check your paste destination.', 'success');
        } catch (error) {
            console.error('Copy everything error:', error);
            showStatus(`❌ Error: ${sanitizeText(error.message || String(error))}`, 'error');
        }
    });

    // Format network requests for clipboard
    async function formatNetworkRequests(requests) {
        try {
            let output = '='.repeat(80) + '\n';
            output += 'NETWORK REQUESTS EXPORT\n';
            output += `Captured at: ${new Date().toISOString()}\n`;
            output += `Total requests: ${requests.length}\n`;
            output += '='.repeat(80) + '\n\n';

            for (let i = 0; i < requests.length; i++) {
                try {
                    const req = requests[i];
                    if (!req) continue;

                    output += `Request #${i + 1}\n`;
                    output += '-'.repeat(80) + '\n';
                    output += `URL: ${req.request?.url || 'unknown'}\n`;
                    output += `Method: ${req.request?.method || 'unknown'}\n`;
                    output += `Status: ${req.response?.status || 'unknown'} ${req.response?.statusText || ''}\n`;
                    output += `Type: ${req._resourceType || 'unknown'}\n`;
                    output += `Time: ${req.time || 0}ms\n`;

                    // Request headers
                    if (req.request?.headers && Array.isArray(req.request.headers)) {
                        output += '\nRequest Headers:\n';
                        req.request.headers.forEach(header => {
                            if (header && header.name && header.value) {
                                output += `  ${header.name}: ${header.value}\n`;
                            }
                        });
                    }

                    // Response headers
                    if (req.response?.headers && Array.isArray(req.response.headers)) {
                        output += '\nResponse Headers:\n';
                        req.response.headers.forEach(header => {
                            if (header && header.name && header.value) {
                                output += `  ${header.name}: ${header.value}\n`;
                            }
                        });
                    }

                    // Request body
                    if (req.request?.postData) {
                        output += '\nRequest Body:\n';
                        output += req.request.postData.text || '(binary data)';
                        output += '\n';
                    }

                    // Response body
                    try {
                        if (typeof req.getContent === 'function') {
                            const content = await new Promise((resolve, reject) => {
                                const timeout = setTimeout(() => reject(new Error('Timeout')), 3000);
                                req.getContent((content, encoding) => {
                                    clearTimeout(timeout);
                                    resolve({ content, encoding });
                                });
                            });

                            if (content && content.content) {
                                output += '\nResponse Body:\n';
                                if (content.encoding === 'base64') {
                                    output += '(base64 encoded - binary data)\n';
                                } else {
                                    // Truncate very long responses
                                    const body = content.content.length > 10000
                                        ? content.content.substring(0, 10000) + '\n... (truncated)'
                                        : content.content;
                                    output += body + '\n';
                                }
                            }
                        }
                    } catch (e) {
                        output += '\nResponse Body: (could not retrieve)\n';
                    }

                    output += '\n' + '='.repeat(80) + '\n\n';
                } catch (reqError) {
                    console.error(`Error formatting request ${i + 1}:`, reqError);
                    output += `\nError formatting this request: ${reqError.message}\n\n`;
                }
            }

            return output;
        } catch (error) {
            console.error('Error in formatNetworkRequests:', error);
            throw new Error('Failed to format network requests');
        }
    }

    // Format WebSocket messages for clipboard
    function formatWebSocketMessages(messages) {
        try {
            // 1. Deduplicate identical messages (since background queues and live listeners can sometimes duplicate)
            const uniqueMessages = [];
            const seen = new Set();
            messages.forEach(ws => {
                if (!ws) return;
                const sig = JSON.stringify({
                    url: ws.url,
                    cid: ws.connectionId,
                    ts: ws.timestamp,
                    type: ws.eventType || ws.resourceType,
                    dir: ws.direction,
                    code: ws.code,
                    payload: typeof ws.payload === 'string' && ws.payload.length > 200 ? ws.payload.substring(0, 200) : ws.payload
                });
                if (!seen.has(sig)) {
                    seen.add(sig);
                    uniqueMessages.push(ws);
                }
            });

// 2. Group by URL and Connection ID to separate different connections to the same endpoint
            const grouped = {};
            uniqueMessages.forEach(ws => {
                const url = ws.url || 'unknown';
                const cid = ws.connectionId ? `_cid_${ws.connectionId}` : '';
                const groupKey = `${url}${cid}`;
                
                if (!grouped[groupKey]) {
                    grouped[groupKey] = {
                        url: url,
                        connectionId: ws.connectionId,
                        messages: []
                    };
                }
                grouped[groupKey].messages.push(ws);
            });

            let output = '='.repeat(80) + '\n';
            output += 'WEBSOCKET CONNECTIONS EXPORT\n';
            output += `Captured at: ${new Date().toISOString()}\n`;
            if (messages.length !== uniqueMessages.length) {
                output += `Total events: ${uniqueMessages.length} (filtered out ${messages.length - uniqueMessages.length} duplicates)\n`;
            } else {
                output += `Total events: ${uniqueMessages.length}\n`;
            }
            output += '='.repeat(80) + '\n\n';

            let groupCounter = 1;
            for (const [groupKey, groupData] of Object.entries(grouped)) {
                const groupMessages = groupData.messages;
                const isPageHook = groupMessages.some(m => m.source === 'page-hook');

                output += `Stream Group #${groupCounter}\n`;
                output += '-'.repeat(80) + '\n';
                output += `URL: ${groupData.url}\n`;
                if (groupData.connectionId) {
                    output += `Connection ID: #${groupData.connectionId}\n`;
                }
                output += `Source: ${isPageHook ? 'Page WebSocket Hook & Network' : 'Network API'}\n`;
                output += '-'.repeat(80) + '\n\n';

                groupMessages.forEach((ws) => {
                    try {
                        const timeRaw = ws.timestamp || 'unknown time';
                        // Keep just the Time portion for a cleaner display
                        const time = timeRaw.includes('T') ? timeRaw.split('T')[1].replace('Z', '') : timeRaw;

                        if (ws.source === 'page-hook') {
                            const evType = (ws.eventType || 'message').toUpperCase();
                            const dir = ws.direction ? ` ${ws.direction.toUpperCase()}` : '';
                            
                            output += `[${time}] [${evType}${dir}]`;

                            if (ws.payload !== null && typeof ws.payload !== 'undefined') {
                                let p = String(ws.payload);
                                if (p.includes('\n')) {
                                    output += `\n    Payload:\n      ${p.replace(/\n/g, '\n      ')}\n`;
                                } else {
                                    output += ` Payload: ${p}\n`;
                                }
                            } else {
                                const meta = [];
                                if (ws.protocol) meta.push(`Protocol: ${ws.protocol}`);
                                if (ws.extensions) meta.push(`Ext: ${ws.extensions}`);
                                if (typeof ws.code !== 'undefined') meta.push(`Code: ${ws.code}`);
                                if (ws.reason) meta.push(`Reason: ${ws.reason}`);
                                if (typeof ws.wasClean !== 'undefined') meta.push(`Clean: ${ws.wasClean}`);
                                
                                if (meta.length > 0) {
                                    output += ` ${meta.join(' | ')}`;
                                }
                                output += '\n';
                            }
                        } else {
                            // Network API connection
                            output += `[${time}] [NETWORK HTTP UPGRADE]\n`;
                            if (ws.request && ws.request.method) {
                                output += `    Method: ${ws.request.method}\n`;
                            }
                            if (ws.response && ws.response.status) {
                                output += `    Status: ${ws.response.status} ${ws.response.statusText || ''}\n`;
                            }
                        }
                    } catch (wsError) {
                        console.error(`Error formatting WebSocket event:`, wsError);
                        output += `[Error formatting this event]\n`;
                    }
                });
                
                output += '\n';
                groupCounter++;
            }

            output += '='.repeat(80) + '\n';
            output += '\n📝 NOTE: This export contains deduplicated timeline structures.\n';
            output += '   - Connection handshake logs (Network API)\n';
            output += '   - Timeline frames & open/close logs (Page WebSocket hook)\n';
            output += '\n✨ No annoying "debugging" popups - works seamlessly!\n';
            return output;
        } catch (error) {
            console.error('Error in formatWebSocketMessages:', error);
            throw new Error('Failed to format WebSocket messages');
        }
    }

    // Show status message
    function showStatus(message, type) {
        try {
            const statusEl = document.getElementById('status');
            if (!statusEl) return;

            statusEl.textContent = sanitizeText(message);
            statusEl.className = `status ${type}`;
            statusEl.style.display = 'block';

            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 5000);
        } catch (error) {
            console.error('Error showing status:', error);
        }
    }

    // Format Application Data (localStorage, sessionStorage, cookies)
    function formatApplicationData(data) {
        let output = '='.repeat(80) + '\n';
        output += 'APPLICATION DATA EXPORT\n';
        output += `Captured at: ${data.timestamp || new Date().toISOString()}\n`;
        output += `URL: ${data.url || 'unknown'}\n`;
        output += '='.repeat(80) + '\n\n';

        // localStorage
        output += 'LOCAL STORAGE\n';
        output += '-'.repeat(80) + '\n';
        if (data.localStorage && typeof data.localStorage === 'object') {
            const keys = Object.keys(data.localStorage);
            if (keys.length > 0) {
                keys.forEach(key => {
                    output += `${key}: ${data.localStorage[key]}\n`;
                });
            } else {
                output += '(empty)\n';
            }
        }
        output += '\n';

        // sessionStorage
        output += 'SESSION STORAGE\n';
        output += '-'.repeat(80) + '\n';
        if (data.sessionStorage && typeof data.sessionStorage === 'object') {
            const keys = Object.keys(data.sessionStorage);
            if (keys.length > 0) {
                keys.forEach(key => {
                    output += `${key}: ${data.sessionStorage[key]}\n`;
                });
            } else {
                output += '(empty)\n';
            }
        }
        output += '\n';

        // Cookies
        output += 'COOKIES\n';
        output += '-'.repeat(80) + '\n';
        output += data.cookies || '(no cookies)';
        output += '\n\n';

        // Cache Storage
        output += 'CACHE STORAGE\n';
        output += '-'.repeat(80) + '\n';
        if (data.caches && Object.keys(data.caches).length > 0) {
            for (const [cacheName, requests] of Object.entries(data.caches)) {
                output += `[Cache: ${cacheName}]\n`;
                if (Array.isArray(requests) && requests.length > 0) {
                    requests.forEach(req => output += `  - ${req}\n`);
                } else if (requests.error) {
                    output += `  ${requests.error}\n`;
                } else {
                    output += `  (empty)\n`;
                }
            }
        } else {
            output += '(empty or unavailable)\n';
        }
        output += '\n';

        // IndexedDB
        output += 'INDEXED DB\n';
        output += '-'.repeat(80) + '\n';
        if (data.indexedDB && Array.isArray(data.indexedDB) && data.indexedDB.length > 0) {
            data.indexedDB.forEach(db => {
                if (db.error) {
                    output += `${db.error}\n`;
                } else {
                    output += `Database: ${db.name} (Version: ${db.version})\n`;
                }
            });
        } else {
            output += '(empty or unavailable)\n';
        }
        output += '\n';

        output += '='.repeat(80) + '\n';
        return output;
    }

    // Format Redux State
    function formatReduxState(data) {
        let output = '='.repeat(80) + '\n';
        output += 'REDUX STATE EXPORT\n';
        output += `Captured at: ${new Date().toISOString()}\n`;
        output += `Available: ${data.available ? 'Yes' : 'No'}\n`;
        if (data.method) {
            output += `Method: ${data.method}\n`;
        }
        output += '='.repeat(80) + '\n\n';

        if (data.state) {
            output += 'STATE:\n';
            output += JSON.stringify(data.state, null, 2);
        } else if (data.available) {
            output += 'Redux is available but state could not be accessed.\n';
            output += '\nTo export Redux state, ensure your app exposes the store:\n';
            output += '  window.store = store; // Add this in your Redux setup\n';
        } else {
            output += 'Redux state not found.\n';
            output += '\nTo enable Redux export:\n';
            output += '1. Install Redux DevTools Extension\n';
            output += '2. Or expose your store: window.store = store;\n';
        }

        output += '\n' + '='.repeat(80) + '\n';
        return output;
    }

    // Format Console Logs
    function formatConsoleLogs(logs) {
        let output = '='.repeat(80) + '\n';
        output += 'CONSOLE LOGS EXPORT\n';
        output += `Captured at: ${new Date().toISOString()}\n`;
        
        // Group consecutive identical logs 
        let groupedLogs = [];
        let currentGroup = null;

        logs.forEach(log => {
            // Group by text, level, url, and line just like Chrome DevTools
            if (!currentGroup || currentGroup.text !== log.text || currentGroup.level !== log.level || currentGroup.url !== log.url || currentGroup.line !== log.line) {
                if (currentGroup) {
                    groupedLogs.push(currentGroup);
                }
                currentGroup = { ...log, count: 1 };
            } else {
                currentGroup.count++;
            }
        });
        if (currentGroup) {
            groupedLogs.push(currentGroup);
        }

        output += `Total logs: ${logs.length} (Grouped into ${groupedLogs.length} unique traces)\n`;
        output += '='.repeat(80) + '\n\n';

        groupedLogs.forEach((log) => {
            let prefix = `[${log.timestamp}] `;
            if (log.count > 1) {
                prefix += `(${log.count}) `;
            }
            
            // Format location string like "content.js:24 "
            let sourceLoc = '';
            if (log.url) {
                try {
                    const u = new URL(log.url);
                    const file = u.pathname.substring(u.pathname.lastIndexOf('/') + 1) || u.hostname;
                    sourceLoc = `${file}:${log.line} `;
                } catch(e) {
                    sourceLoc = `${log.url}:${log.line} `;
                }
            } else if (log.source && log.source !== 'console') {
                sourceLoc = `[${log.source}] `;
            }

            output += `${prefix}[${log.level.toUpperCase()}] ${sourceLoc}${log.text}\n`;
        });

        output += '\n' + '='.repeat(80) + '\n';
        return output;
    }

    // Format DOM Content
    function formatDOMContent(data) {
        let output = '='.repeat(80) + '\n';
        output += 'DOM/HTML CONTENT EXPORT\n';
        output += `Captured at: ${new Date().toISOString()}\n`;
        output += `URL: ${data.url || 'unknown'}\n`;
        output += `Title: ${data.title || 'unknown'}\n`;
        output += `Character Set: ${data.characterSet || 'unknown'}\n`;
        output += '='.repeat(80) + '\n\n';

        output += 'FULL HTML:\n';
        output += '-'.repeat(80) + '\n';
        output += data.html || '(no HTML content)';
        output += '\n\n' + '='.repeat(80) + '\n';

        return output;
    }

    // Format Everything Combined
    function formatEverything(allData) {
        let output = '╔'.repeat(40) + '╗\n';
        output += '║  COMPLETE DEVTOOLS DATA EXPORT - ALL SECTIONS  ║\n';
        output += '╚'.repeat(40) + '╝\n';
        output += `Exported at: ${allData.timestamp}\n`;
        output += `URL: ${allData.url}\n`;
        output += '='.repeat(80) + '\n\n';

        const sections = allData.sections;
        let sectionCount = 0;

        if (sections.networkRequests) {
            output += '\n\n' + '█'.repeat(80) + '\n';
            output += '  SECTION 1: NETWORK REQUESTS\n';
            output += '█'.repeat(80) + '\n\n';
            output += sections.networkRequests;
            sectionCount++;
        }

        if (sections.webSocketMessages) {
            output += '\n\n' + '█'.repeat(80) + '\n';
            output += `  SECTION ${sectionCount + 1}: WEBSOCKET MESSAGES\n`;
            output += '█'.repeat(80) + '\n\n';
            output += sections.webSocketMessages;
            sectionCount++;
        }

        if (sections.applicationData) {
            output += '\n\n' + '█'.repeat(80) + '\n';
            output += `  SECTION ${sectionCount + 1}: APPLICATION DATA\n`;
            output += '█'.repeat(80) + '\n\n';
            output += sections.applicationData;
            sectionCount++;
        }

        if (sections.reduxState) {
            output += '\n\n' + '█'.repeat(80) + '\n';
            output += `  SECTION ${sectionCount + 1}: REDUX STATE\n`;
            output += '█'.repeat(80) + '\n\n';
            output += sections.reduxState;
            sectionCount++;
        }

        if (sections.consoleLogs) {
            output += '\n\n' + '█'.repeat(80) + '\n';
            output += `  SECTION ${sectionCount + 1}: CONSOLE LOGS\n`;
            output += '█'.repeat(80) + '\n\n';
            output += sections.consoleLogs;
            sectionCount++;
        }

        output += '\n\n' + '═'.repeat(80) + '\n';
        output += `  END OF EXPORT - ${sectionCount} SECTIONS INCLUDED\n`;
        output += '═'.repeat(80) + '\n';

        return output;
    }

    // Initialize
    try {
        updateStats();
        console.log('Network & WebSocket Copy Pro - Panel initialized');
    } catch (error) {
        console.error('Initialization error:', error);
    }
