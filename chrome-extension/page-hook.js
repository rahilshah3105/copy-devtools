// === CONSOLE INTERCEPTOR ===
(function captureConsole() {
    if (window.__DEVTOOLS_CONSOLE_HOOK_INSTALLED__) return;
    window.__DEVTOOLS_CONSOLE_HOOK_INSTALLED__ = true;
    const EMIT_DEDUPE_WINDOW_MS = 5000;
    const MAX_RECENT_EMITS = 500;
    const REPEAT_WINDOW_MS = 30000;
    const MAX_NON_EXTENSION_REPEATS_PER_WINDOW = 2;
    const FORCE_NON_EXTENSION_ERRORS_TO_INFO = true;
    const SUPPRESS_NON_EXTENSION_WARN_ERROR = true;

    const NOISY_PATTERNS = {
        suppress: [
            /\[Cloudflare Turnstile\]\s*Compatibility layer enabled\.?/i,
            /apple-mobile-web-app-capable.*deprecated/i,
            /\[Intercom\]\s*Launcher is disabled/i,
            /\[GSI_LOGGER\]/i,
            /A matching frame for #repo-content-turbo-frame was missing from the response, transforming into full-page Visit\.?/i
        ],
        downgradeToInfo: [
            /\[MCP\]\s*Unified registry fetch succeeded but returned 0 servers/i,
            /^\[Violation\].*setTimeout.*\d+ms/i,
            /^\[Violation\].*longtask.*\d+ms/i
        ]
    };

    const ACTIONABLE_ERROR_PATTERNS = [
        /uncaught/i,
        /unhandled/i,
        /typeerror/i,
        /referenceerror/i,
        /syntaxerror/i,
        /securityerror/i,
        /failed to fetch/i,
        /network request failed/i,
        /cannot read/i,
        /is not a function/i,
        /permission denied/i,
        /csp|content security policy/i,
        /ERR_[A-Z_]+/
    ];

    const recentEmits = new Map();
    const repeatCounter = new Map();

    const safeStringify = (value) => {
        if (value instanceof Error) return value.stack || value.message || String(value);
        if (typeof value === 'string') return value;
        if (value === null || typeof value !== 'object') return String(value);

        const seen = new WeakSet();
        try {
            return JSON.stringify(value, (key, current) => {
                if (typeof current === 'object' && current !== null) {
                    if (seen.has(current)) return '[Circular]';
                    seen.add(current);
                }
                return current;
            });
        } catch (_) {
            return String(value);
        }
    };

    const shouldSuppress = (message) => NOISY_PATTERNS.suppress.some((pattern) => pattern.test(message));
    const shouldDowngrade = (message) => NOISY_PATTERNS.downgradeToInfo.some((pattern) => pattern.test(message));

    const getScriptOriginType = (sourceUrl) => {
        if (!sourceUrl) return 'unknown';
        if (sourceUrl.startsWith('chrome-extension://')) return 'extension';

        try {
            const source = new URL(sourceUrl);
            const current = window.location;
            if (source.origin === current.origin) return 'first-party';
            if (source.hostname === current.hostname) return 'first-party';
            if (source.hostname.endsWith(`.${current.hostname}`) || current.hostname.endsWith(`.${source.hostname}`)) {
                return 'first-party';
            }
            return 'third-party';
        } catch (_) {
            return 'unknown';
        }
    };

    const isLikelyActionable = (message) => ACTIONABLE_ERROR_PATTERNS.some((pattern) => pattern.test(message));

    const shouldSkipDuplicate = (level, text, sourceLoc, sourceUrl) => {
        const now = Date.now();
        const key = `${level}|${text}|${sourceLoc}|${sourceUrl || ''}`;
        const lastSeen = recentEmits.get(key);

        recentEmits.set(key, now);
        if (recentEmits.size > MAX_RECENT_EMITS) {
            for (const [cachedKey, timestamp] of recentEmits) {
                if (now - timestamp > EMIT_DEDUPE_WINDOW_MS) {
                    recentEmits.delete(cachedKey);
                }
                if (recentEmits.size <= MAX_RECENT_EMITS) break;
            }
        }

        return typeof lastSeen === 'number' && (now - lastSeen) < EMIT_DEDUPE_WINDOW_MS;
    };

    const shouldThrottleByRepeat = (level, text, originType) => {
        // Keep extension-level diagnostics intact.
        if (originType === 'extension') return false;
        if (level !== 'error' && level !== 'warn') return false;

        const now = Date.now();
        const normalizedText = String(text || '')
            .replace(/https?:\/\/\S+/g, '[url]')
            .replace(/\b\d+\b/g, '[n]')
            .trim();
        const key = `${originType}|${level}|${normalizedText}`;
        const record = repeatCounter.get(key);

        if (!record || (now - record.startTs) > REPEAT_WINDOW_MS) {
            repeatCounter.set(key, { count: 1, startTs: now });
            return false;
        }

        record.count += 1;
        if (record.count > MAX_NON_EXTENSION_REPEATS_PER_WINDOW) {
            return true;
        }

        return false;
    };

    const getCallerDetails = (stack) => {
        const details = { display: '', url: '' };
        if (!stack) return details;

        const lines = stack.split('\n');
        if (lines.length <= 2) return details;

        const stackLine = lines[2];
        const urlMatch = stackLine.match(/((?:https?|chrome-extension):\/\/[^\s)]+)/);
        if (!urlMatch) return details;

        details.url = urlMatch[1];
        try {
            const parsed = new URL(details.url);
            const fileName = parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname;
            const lineMatch = details.url.match(/:(\d+)(?::\d+)?$/);
            details.display = lineMatch ? `${fileName}:${lineMatch[1]}` : fileName;
        } catch (_) {
            details.display = details.url;
        }

        return details;
    };

    const emit = (type, args, sourceLoc = '', sourceUrl = '') => {
        try {
            const text = args.map(safeStringify).join(' ');
            if (shouldSuppress(text)) return;

            const originType = getScriptOriginType(sourceUrl);

            if (SUPPRESS_NON_EXTENSION_WARN_ERROR && (type === 'error' || type === 'warn') && originType !== 'extension') {
                return;
            }

            let level = (
                shouldDowngrade(text) ||
                ((type === 'error' || type === 'warn') && originType === 'third-party' && !isLikelyActionable(text))
            ) ? 'info' : type;

            if (FORCE_NON_EXTENSION_ERRORS_TO_INFO && (type === 'error' || type === 'warn') && originType !== 'extension') {
                level = 'info';
            }

            if (shouldThrottleByRepeat(type, text, originType)) return;

            if (shouldSkipDuplicate(level, text, sourceLoc, sourceUrl)) return;

            window.postMessage({
                source: 'DEVTOOLS_CONSOLE_HOOK',
                data: {
                    level,
                    text,
                    source: 'console',
                    url: window.location.href,
                    line: sourceLoc,
                    sourceUrl,
                    originType,
                    timestamp: new Date().toISOString()
                }
            }, '*');
        } catch(e) {}
    };

    ['log', 'warn', 'error', 'info', 'debug'].forEach(level => {
        const orig = console[level];
        console[level] = function(...args) {
            let callerInfo = '';
            let callerUrl = '';
            try {
                throw new Error();
            } catch (err) {
                const callerDetails = getCallerDetails(err.stack);
                callerInfo = callerDetails.display;
                callerUrl = callerDetails.url;
            }
            emit(level, args, callerInfo, callerUrl);
            return orig.apply(this, args);
        };
    });

    window.addEventListener('error', (e) => {
        emit('error', [e.message || String(e)], e.filename ? `${e.filename}:${e.lineno}` : '', e.filename || '');
    });

    try {
        if (typeof PerformanceObserver !== 'undefined') {
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 50) {
                        emit('warn', [`[Violation] Forced reflow / 'longtask' handler took ${Math.round(entry.duration)}ms`], '');
                    }
                }
            }).observe({entryTypes: ['longtask']});
        }
    } catch(e) {}
})();

// === REDUX STORE INTERCEPTOR ===
(function captureRedux() {
    if (window.__DEVTOOLS_REDUX_HOOK_INSTALLED__) return;
    window.__DEVTOOLS_REDUX_HOOK_INSTALLED__ = true;

    function isStore(obj) {
        return obj && typeof obj === 'object' && typeof obj.getState === 'function' && typeof obj.dispatch === 'function';
    }

    const handler = {
        apply: function (target, thisArg, argumentsList) {
            const result = Reflect.apply(target, thisArg, argumentsList);
            
            if (isStore(result)) {
                window.__captured_redux_store__ = result;
                return result;
            }

            if (typeof result === 'function') {
                return new Proxy(result, handler);
            }

            return result;
        }
    };

    let devtoolsExt = window.__REDUX_DEVTOOLS_EXTENSION__;
    let devtoolsCompose = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;

    try {
        if (devtoolsExt && typeof devtoolsExt === 'function') devtoolsExt = new Proxy(devtoolsExt, handler);
        if (devtoolsCompose && typeof devtoolsCompose === 'function') devtoolsCompose = new Proxy(devtoolsCompose, handler);

        Object.defineProperty(window, '__REDUX_DEVTOOLS_EXTENSION__', {
            get() { return devtoolsExt; },
            set(val) { typeof val === 'function' ? devtoolsExt = new Proxy(val, handler) : devtoolsExt = val; },
            configurable: true,
            enumerable: true
        });

        Object.defineProperty(window, '__REDUX_DEVTOOLS_EXTENSION_COMPOSE__', {
            get() { return devtoolsCompose; },
            set(val) { typeof val === 'function' ? devtoolsCompose = new Proxy(val, handler) : devtoolsCompose = val; },
            configurable: true,
            enumerable: true
        });
    } catch(e) { /* Ignore if property is locked */ }
})();

// === WEBSOCKET HOOK ===
if (!window.__DEVTOOLS_WS_HOOK_INSTALLED__) {
    window.__DEVTOOLS_WS_HOOK_INSTALLED__ = true;

    const NativeWebSocket = window.WebSocket;
    let connectionIdCounter = 0;

    if (NativeWebSocket) {
        const emit = (type, payload) => {
            window.postMessage({
                source: 'DEVTOOLS_WS_HOOK',
                data: {
                    type,
                    timestamp: new Date().toISOString(),
                    ...payload
                }
            }, '*');
        };

        const toSafeText = (data) => {
            try {
                if (typeof data === 'string') return data;
                if (data instanceof ArrayBuffer) return `[ArrayBuffer ${data.byteLength} bytes]`;
                if (ArrayBuffer.isView(data)) return `[TypedArray ${data.byteLength || data.length} bytes]`;
                if (typeof Blob !== 'undefined' && data instanceof Blob) {
                    return `[Blob ${data.size} bytes type=${data.type || 'unknown'}]`;
                }
                return String(data);
            } catch (_) {
                return '[unserializable payload]';
            }
        };

        function WrappedWebSocket(url, protocols) {
            const ws = protocols !== undefined
                ? new NativeWebSocket(url, protocols)
                : new NativeWebSocket(url);

            const cid = ++connectionIdCounter;

            emit('open_attempt', { url: String(url), connectionId: cid, protocols: protocols || null });

            ws.addEventListener('open', () => emit('open', { url: ws.url || String(url), connectionId: cid, protocol: ws.protocol || '', extensions: ws.extensions || '' }));
            ws.addEventListener('message', (event) => emit('message', { url: ws.url || String(url), connectionId: cid, direction: 'incoming', data: toSafeText(event.data) }));
            ws.addEventListener('close', (event) => emit('close', { url: ws.url || String(url), connectionId: cid, code: event.code, reason: event.reason, wasClean: event.wasClean }));
            ws.addEventListener('error', () => emit('error', { url: ws.url || String(url), connectionId: cid }));

            const nativeSend = ws.send;
            ws.send = function send(data) {
                emit('message', { url: ws.url || String(url), connectionId: cid, direction: 'outgoing', data: toSafeText(data) });
                return nativeSend.call(ws, data);
            }

            return ws;
        }

        WrappedWebSocket.prototype = NativeWebSocket.prototype;
        Object.setPrototypeOf(WrappedWebSocket, NativeWebSocket);
        Object.defineProperty(WrappedWebSocket, 'CONNECTING', { get: () => NativeWebSocket.CONNECTING });
        Object.defineProperty(WrappedWebSocket, 'OPEN', { get: () => NativeWebSocket.OPEN });
        Object.defineProperty(WrappedWebSocket, 'CLOSING', { get: () => NativeWebSocket.CLOSING });
        Object.defineProperty(WrappedWebSocket, 'CLOSED', { get: () => NativeWebSocket.CLOSED });

        window.WebSocket = WrappedWebSocket;
        emit('hook_installed', { url: window.location.href });
    }

    // Listen for requests from the content script to extract Redux state
    window.addEventListener('message', (event) => {
        if (event.source !== window || !event.data) return;
        
        if (event.data.action === 'DEVTOOLS_GET_REDUX_STATE') {
            const requestId = event.data.requestId;
            
            const reduxData = {
                available: false,
                state: null,
                method: null
            };

            try {
                // Method 1: Check Intercepted Redux Store (Works perfectly if Redux DevTools is enabled in the app)
                if (window.__captured_redux_store__ && typeof window.__captured_redux_store__.getState === 'function') {
                    reduxData.state = window.__captured_redux_store__.getState();
                    reduxData.available = true;
                    reduxData.method = 'Redux DevTools Interceptor';
                }
                // Method 2: Check Redux DevTools Extension (Fallback)
                else if (window.__REDUX_DEVTOOLS_EXTENSION__) {
                    reduxData.available = true;
                    reduxData.method = 'Redux DevTools Extension';
                }

                // Method 3: Check for exposed store on window
                if (!reduxData.state && window.store && typeof window.store.getState === 'function') {
                    reduxData.state = window.store.getState();
                    reduxData.available = true;
                    reduxData.method = 'window.store';
                } else if (!reduxData.state) {
                    // Method 3: Check common Redux store locations
                    const commonStoreNames = ['__store__', '_store', 'reduxStore', 'Store'];
                    for (const name of commonStoreNames) {
                        if (window[name] && typeof window[name].getState === 'function') {
                            reduxData.state = window[name].getState();
                            reduxData.available = true;
                            reduxData.method = `window.${name}`;
                            break;
                        }
                    }
                }

                // Method 4: Scan React DOM Tree for Provider (Extremely reliable fallback)
                if (!reduxData.state) {
                    try {
                        const allElems = document.querySelectorAll('*');
                        for (let i = 0; i < allElems.length; i++) {
                            const el = allElems[i];
                            const keys = Object.keys(el);
                            for (const key of keys) {
                                if (key.startsWith('__reactContainer$') || key.startsWith('__reactFiber$')) {
                                    let queue = [el[key]];
                                    let visited = new Set();

                                    while (queue.length > 0 && visited.size < 10000) {
                                        let node = queue.shift();
                                        if (!node || visited.has(node)) continue;
                                        visited.add(node);

                                        const props = node.memoizedProps || node.pendingProps;
                                        if (props && props.store && typeof props.store.getState === 'function') {
                                            reduxData.state = props.store.getState();
                                            reduxData.available = true;
                                            reduxData.method = 'React HTML Tree Scanner';
                                            break;
                                        }
                                        if (props && props.children && props.children.props && props.children.props.store && typeof props.children.props.store.getState === 'function') {
                                            reduxData.state = props.children.props.store.getState();
                                            reduxData.available = true;
                                            reduxData.method = 'React HTML Tree Scanner';
                                            break;
                                        }

                                        if (node.child) queue.push(node.child);
                                        if (node.sibling) queue.push(node.sibling);
                                    }
                                }
                                if (reduxData.state) break;
                            }
                            if (reduxData.state) break;
                        }
                    } catch (e) { }
                }

                // Method 5: Try to access React's internal instance (last resort)
                if (!reduxData.state && typeof window.React !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                    reduxData.method = 'React DevTools detected';
                    reduxData.available = true;
                }
            } catch (e) {
                reduxData.error = e.message;
            }

            window.postMessage({
                source: 'DEVTOOLS_REDUX_RESPONSE',
                requestId: requestId,
                data: reduxData
            }, '*');
        }
    });
}
