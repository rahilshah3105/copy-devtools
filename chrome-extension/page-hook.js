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
            }

            WrappedWebSocket.prototype = NativeWebSocket.prototype;
            Object.setPrototypeOf(WrappedWebSocket, NativeWebSocket);
            WrappedWebSocket.CONNECTING = NativeWebSocket.CONNECTING;
            WrappedWebSocket.OPEN = NativeWebSocket.OPEN;
            WrappedWebSocket.CLOSING = NativeWebSocket.CLOSING;
            WrappedWebSocket.CLOSED = NativeWebSocket.CLOSED;

            window.WebSocket = WrappedWebSocket;
            emit('hook_installed', { url: window.location.href });
        }
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
