# DevTools Data Exporter Pro

🚀 **The Ultimate Chrome Extension for Developers** - Export ALL your debugging data with one click!

## 🎯 What Does This Extension Do?

Tired of manually copying data from Chrome DevTools? This extension solves that problem by letting you export:

✅ **Network Requests** - All HTTP/HTTPS traffic  
✅ **WebSocket Messages** - Complete WS communication logs  
✅ **Application Data** - localStorage, sessionStorage, cookies  
✅ **Redux State** - Complete Redux store (FREE method included!)  
✅ **Console Logs** - All console.log/error/warn messages  
✅ **DOM Content** - Full HTML structure  
✅ **Everything Combined** - One-click export of ALL data!  

## 🆓 FREE Redux State Export (No API Key Needed!)

See [REDUX_SETUP_GUIDE.md](REDUX_SETUP_GUIDE.md) for the FREE method to export Redux state without any paid API!

**Quick Setup:** Just add one line to your Redux store:
```javascript
window.store = store; // That's it!
```

## 🚀 Quick Start

### 1. Generate Icons (2 minutes)
Open [icon-generator.html](icon-generator.html) in Chrome → Download all icons → Save to `icons/` folder

### 2. Load Extension (1 minute)
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

### 3. Use It! (30 seconds)
1. Open any webpage
2. Press F12 → Go to "Data Export" tab
3. Click any export button
4. Paste your data anywhere!

## 📊 All Export Features

| Feature | What It Exports | Use Case |
|---------|----------------|----------|
| **Network Requests** | URLs, headers, bodies, timing | API debugging, documentation |
| **WebSocket Messages** | All sent/received frames | Real-time app debugging |
| **Application Data** | localStorage, sessionStorage, cookies | State persistence issues |
| **Redux State** | Complete Redux store tree | State management debugging |
| **Console Logs** | All console outputs with timestamps | Error tracking, logging |
| **DOM Content** | Full HTML structure | UI debugging, documentation |
| **Everything** | All above in one export! | Complete debugging snapshot |

## 🔧 Advanced Features

### Redux State Export (FREE!)
No paid API needed! Just expose your Redux store:

```javascript
// In your Redux setup:
const store = createStore(rootReducer);
window.store = store; // Add this one line!
```

See [REDUX_SETUP_GUIDE.md](REDUX_SETUP_GUIDE.md) for detailed instructions for React, Next.js, Vue, and more!

### Console Log Capture
Automatically captures all console messages in real-time as your app runs.

### Application Data
Exports:
- All localStorage items
- All sessionStorage items  
- All cookies
- Timestamps and URLs

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](QUICKSTART.md) | 5-minute setup guide |
| [REDUX_SETUP_GUIDE.md](REDUX_SETUP_GUIDE.md) | FREE Redux state export setup |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Publishing to Chrome Web Store |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | Comprehensive testing |
| [SECURITY.md](SECURITY.md) | Security & privacy |

## 🔒 Privacy & Security

- ✅ **100% Local** - All data stays in your browser
- ✅ **No External Servers** - Nothing sent to external APIs
- ✅ **Open Source** - Transparent code
- ✅ **Minimal Permissions** - Only what's needed
- ✅ **Manifest V3** - Latest Chrome standard

## 🎨 Features

### What Makes This Different?

**Before (Chrome DevTools):**
- ❌ Copy requests one by one
- ❌ No WebSocket message export
- ❌ Can't export Redux state easily
- ❌ Manual localStorage copying
- ❌ Console logs disappear

**After (This Extension):**
- ✅ One-click export ALL requests
- ✅ Complete WebSocket logs
- ✅ FREE Redux state export
- ✅ Auto-export Application data
- ✅ Persistent console log capture

## 🛠️ Development

```bash
# Generate icons
node generate_icons.js

# Test the extension
# Load in chrome://extensions/ with Developer mode ON
```

## 📦 Publishing

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete Chrome Web Store publishing instructions.

## 🐛 Troubleshooting

**Extension not appearing?**
- Make sure icons are in PNG format in `icons/` folder
- Reload the extension in chrome://extensions/

**Redux state not found?**
- See [REDUX_SETUP_GUIDE.md](REDUX_SETUP_GUIDE.md)
- Make sure you exposed `window.store = store;`

**Application data fails?**
- Make sure you're on a valid webpage (not chrome:// pages)
- Check if the page has localStorage/cookies

## 🤝 Contributing

Enhancement ideas implemented:
- ✅ Network requests export
- ✅ WebSocket messages export
- ✅ Application data (localStorage, sessionStorage, cookies)
- ✅ Redux state capture (FREE method)
- ✅ Console logs capture
- ✅ DOM/HTML export
- ✅ Combined "Export Everything" feature

Future possibilities:
- IndexedDB export
- Service Worker logs
- Network HAR format
- Performance metrics

## 📄 License

MIT License - Free to use and modify

## 🎉 Success!

You now have the most comprehensive DevTools data exporter available - completely FREE!

**No paid APIs, no subscriptions, just pure developer productivity!** 🚀

---

**Made with ❤️ for developers who need to copy everything!**
