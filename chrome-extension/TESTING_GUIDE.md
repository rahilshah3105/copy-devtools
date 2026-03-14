# Testing Guide - Network & WebSocket Copy Pro

## 🧪 Comprehensive Testing Checklist

Use this guide to thoroughly test the extension before publishing.

---

## 1. Installation Testing

### Load Unpacked Extension
- [ ] Navigate to `chrome://extensions/`
- [ ] Enable Developer mode
- [ ] Click "Load unpacked"
- [ ] Select the chrome-extension folder
- [ ] Extension appears without errors
- [ ] Extension icon visible in toolbar

### Icon Display
- [ ] Icon shows in extensions toolbar
- [ ] Icon displays correctly (not broken/missing)
- [ ] Click icon opens popup
- [ ] Popup displays correctly

---

## 2. DevTools Integration Testing

### Basic Access
- [ ] Open DevTools (F12) on any webpage
- [ ] "WS Copy" tab appears in DevTools
- [ ] Click "WS Copy" tab - panel loads successfully
- [ ] No JavaScript errors in console
- [ ] All UI elements visible and styled correctly

### UI Elements Check
- [ ] Title displays: "Network & WebSocket Copy Pro"
- [ ] Info box visible with instructions
- [ ] Three buttons visible:
  - "Copy All Network Requests"
  - "Copy WebSocket Messages"
  - "Clear Captured Data"
- [ ] Statistics cards display:
  - Network Requests counter
  - WebSocket Messages counter
  - Total Data Size
- [ ] Instructions section visible
- [ ] All elements properly styled

---

## 3. Network Request Capture Testing

### Basic HTTP Requests
1. [ ] Open DevTools and go to "WS Copy" tab
2. [ ] Navigate to a test website (e.g., https://httpbin.org/get)
3. [ ] Network Requests counter increases
4. [ ] Click "Copy All Network Requests"
5. [ ] Success message appears
6. [ ] Paste into text editor - data appears correctly
7. [ ] Verify exported data includes:
   - [ ] Request URLs
   - [ ] HTTP methods
   - [ ] Status codes
   - [ ] Headers
   - [ ] Request/response bodies

### Different Request Types
Test with various HTTP methods:
- [ ] GET requests
- [ ] POST requests (e.g., form submissions)
- [ ] PUT requests
- [ ] DELETE requests
- [ ] OPTIONS requests

### Large Payloads
- [ ] Test with API returning large JSON (>1MB)
- [ ] Verify truncation works for very large responses
- [ ] No browser freeze or crash
- [ ] Memory usage remains reasonable

---

## 4. WebSocket Testing

### WebSocket Connection
Test sites with WebSocket:
- [ ] https://www.websocket.org/echo.html
- [ ] https://socketsbay.com/test-websockets
- [ ] Your own WebSocket application

### WebSocket Capture
1. [ ] Open DevTools "WS Copy" tab BEFORE WebSocket connects
2. [ ] Establish WebSocket connection on test page
3. [ ] Send test messages
4. [ ] WebSocket Messages counter increases
5. [ ] Click "Copy WebSocket Messages"
6. [ ] Success message appears
7. [ ] Paste data - WebSocket frames visible
8. [ ] Verify exported data includes:
   - [ ] WebSocket URL
   - [ ] Timestamps
   - [ ] Message content
   - [ ] Sent/received frames

### Edge Cases
- [ ] Test with wss:// (secure WebSocket)
- [ ] Test with ws:// (insecure WebSocket)
- [ ] Test with binary WebSocket data
- [ ] Test with high-frequency messages (100+ per second)
- [ ] Test reconnecting WebSocket
- [ ] Test closing WebSocket connection

---

## 5. Error Handling Testing

### No Data Scenarios
- [ ] Click "Copy All Network Requests" with no data
  - Shows appropriate error message
- [ ] Click "Copy WebSocket Messages" with no data
  - Shows appropriate error message

### Permission Issues
- [ ] Test in incognito mode (if permissions allow)
- [ ] Test with clipboard access denied (if possible)
- [ ] Error messages are user-friendly

### Failed Requests
- [ ] Test with 404 errors
- [ ] Test with 500 errors
- [ ] Test with network timeouts
- [ ] Test with CORS errors
- [ ] Extension handles gracefully

---

## 6. Memory & Performance Testing

### Memory Management
1. [ ] Open Chrome Task Manager (Shift+Esc)
2. [ ] Find extension process
3. [ ] Note initial memory usage
4. [ ] Capture 1000+ network requests
5. [ ] Memory usage remains reasonable (<100MB)
6. [ ] Click "Clear Captured Data"
7. [ ] Memory usage decreases

### Performance
- [ ] No noticeable lag when capturing data
- [ ] DevTools remains responsive
- [ ] No impact on page load times
- [ ] Export operation completes quickly (<5 seconds for 1000 requests)

---

## 7. Cross-Browser Testing (Chrome Variants)

Test on different Chrome-based browsers:
- [ ] Google Chrome (latest stable)
- [ ] Google Chrome Beta
- [ ] Google Chrome Canary (if possible)
- [ ] Microsoft Edge Chromium
- [ ] Brave Browser
- [ ] Opera (Chromium-based)

For each browser:
- [ ] Extension loads successfully
- [ ] All features work correctly
- [ ] No compatibility errors

---

## 8. Different Websites Testing

Test on various types of websites:

### Static Sites
- [ ] Simple HTML pages
- [ ] GitHub pages
- [ ] Documentation sites

### Dynamic Sites
- [ ] Single Page Applications (React, Vue, Angular)
- [ ] Social media sites (Twitter, Facebook)
- [ ] E-commerce sites (Amazon, eBay)

### Real-time Applications
- [ ] Chat applications (Slack, Discord web)
- [ ] Trading platforms
- [ ] Live sports scores
- [ ] Streaming sites

### Local Development
- [ ] localhost:3000 (development server)
- [ ] 127.0.0.1 sites
- [ ] Local file:// protocol (if applicable)

---

## 9. Security Testing

### Data Privacy
- [ ] Verify no data sent to external servers
- [ ] Check network tab - no external API calls
- [ ] Review code - no analytics/tracking
- [ ] Clipboard data stays local

### Permission Usage
- [ ] Only required permissions used
- [ ] No excessive permission requests
- [ ] Permissions justified in documentation

### XSS Prevention
- [ ] Test with malicious payloads in network data
- [ ] Verify sanitization works
- [ ] No script execution from copied data

---

## 10. UI/UX Testing

### Popup
- [ ] Opens quickly (<100ms)
- [ ] All text readable
- [ ] Buttons clickable
- [ ] Help information clear
- [ ] Close button works

### DevTools Panel
- [ ] Responsive at different sizes
- [ ] Scrolling works properly
- [ ] Buttons remain accessible
- [ ] Statistics update in real-time
- [ ] Status messages visible and clear

### Visual Design
- [ ] Colors consistent
- [ ] Typography readable
- [ ] Icons clear and recognizable
- [ ] Spacing appropriate
- [ ] No visual glitches

---

## 11. Edge Cases & Stress Testing

### Extreme Scenarios
- [ ] 10,000+ network requests captured
- [ ] Very long URLs (>2000 characters)
- [ ] Special characters in URLs (emoji, unicode)
- [ ] Requests with no response body
- [ ] Requests with binary data
- [ ] WebSocket with 1000+ messages
- [ ] Multiple WebSocket connections simultaneously

### Rapid Actions
- [ ] Spam click export buttons
- [ ] Rapidly open/close DevTools
- [ ] Switch tabs quickly while capturing
- [ ] Clear data while capture in progress

---

## 12. Update & Uninstall Testing

### Updates
- [ ] Modify version number
- [ ] Reload extension
- [ ] Data preserved (if applicable)
- [ ] No errors after update

### Uninstall
- [ ] Remove extension
- [ ] No leftover processes
- [ ] No console errors on reload
- [ ] Clean uninstallation

---

## 13. Documentation Testing

### README
- [ ] Instructions clear and accurate
- [ ] All links work
- [ ] Screenshots match current version (if included)

### Deployment Guide
- [ ] Steps are accurate
- [ ] Can be followed by non-developers
- [ ] No steps missing

### Code Comments
- [ ] Functions documented
- [ ] Complex logic explained
- [ ] TODO items addressed

---

## 14. Pre-Publication Checklist

Before submitting to Chrome Web Store:

### Code Quality
- [ ] No console.log for debugging (remove or comment out)
- [ ] No hardcoded test URLs
- [ ] All TODO comments resolved
- [ ] Code formatted consistently
- [ ] No unused variables/functions

### Assets
- [ ] All icon sizes present (16, 48, 128)
- [ ] Icons are PNG format
- [ ] Icons are professional quality
- [ ] No placeholder icons

### Manifest
- [ ] Version number updated
- [ ] Description accurate
- [ ] Permissions minimized
- [ ] URLs updated (if any)

### Legal
- [ ] No copyrighted content
- [ ] License file included
- [ ] Privacy policy reviewed (if needed)
- [ ] Terms of service (if applicable)

---

## 🐛 Bug Reporting Template

If you find bugs during testing, document them:

```
**Bug Title:** 
**Severity:** Critical / High / Medium / Low
**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**

**Actual Behavior:**

**Environment:**
- Chrome Version: 
- OS: 
- Extension Version: 

**Screenshots:**
(if applicable)

**Console Errors:**
(if any)
```

---

## 📊 Test Results Summary

After completing all tests, fill out:

| Category | Pass/Fail | Notes |
|----------|-----------|-------|
| Installation | ☐ | |
| DevTools Integration | ☐ | |
| Network Capture | ☐ | |
| WebSocket Capture | ☐ | |
| Error Handling | ☐ | |
| Memory/Performance | ☐ | |
| Cross-Browser | ☐ | |
| Security | ☐ | |
| UI/UX | ☐ | |
| Edge Cases | ☐ | |

---

## ✅ Final Approval

- [ ] All critical tests passed
- [ ] No major bugs remaining
- [ ] Documentation complete
- [ ] Ready for Chrome Web Store submission

**Tested by:** _______________
**Date:** _______________
**Version:** _______________

---

## 📞 Testing Resources

### Test WebSocket Sites
- https://www.websocket.org/echo.html
- https://socketsbay.com/test-websockets
- wss://echo.websocket.org/

### Test API Sites
- https://httpbin.org/
- https://jsonplaceholder.typicode.com/
- https://reqres.in/

### Chrome Testing Tools
- Chrome DevTools Console
- Chrome Task Manager (Shift+Esc)
- chrome://inspect (for debugging)
- chrome://extensions (for management)

---

**Good luck with testing! 🚀**
