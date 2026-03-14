# 🧪 Local Testing Checklist - FREE Testing Guide

**No payment needed!** Test everything locally before deciding to publish.

---

## ✅ Pre-Testing Setup

- [ ] Extension loaded at `chrome://extensions/`
- [ ] "Developer mode" is ON
- [ ] Extension shows as "Enabled"
- [ ] No errors showing in extension card

---

## 🧪 Test 1: Network Requests Copy (CORE FEATURE)

**Website to test:** https://jsonplaceholder.typicode.com/posts

1. [ ] Open the website
2. [ ] Press F12 (DevTools opens)
3. [ ] Find "Data Export" tab
4. [ ] Click "📋 Copy Network Requests" button
5. [ ] Open Notepad
6. [ ] Press Ctrl+V (paste)
7. [ ] **VERIFY:** See JSON with URLs, methods, status codes

**Expected Output Format:**
```
=== NETWORK REQUESTS (X requests) ===

Request #1:
URL: https://jsonplaceholder.typicode.com/posts
Method: GET
Status: 200 OK
...
```

**✅ PASS / ❌ FAIL:** _________

---

## 🧪 Test 2: Application Data Copy

**Website to test:** Any website (try https://github.com)

1. [ ] Open website
2. [ ] Press F12
3. [ ] Click "Data Export" tab
4. [ ] Click "💾 Copy Application Data" button
5. [ ] Paste in Notepad
6. [ ] **VERIFY:** See localStorage, sessionStorage, cookies data

**Expected Output Format:**
```
=== APPLICATION DATA ===

=== localStorage ===
key1: value1
key2: value2

=== sessionStorage ===
...

=== Cookies ===
...
```

**✅ PASS / ❌ FAIL:** _________

---

## 🧪 Test 3: Console Logs Copy

**Website to test:** Any website

1. [ ] Open website
2. [ ] Press F12
3. [ ] Open **Console** tab
4. [ ] Type: `console.log('Testing 123')`
5. [ ] Type: `console.error('Test error')`
6. [ ] Type: `console.warn('Test warning')`
7. [ ] Go back to **"Data Export"** tab
8. [ ] Click "📝 Copy Console Logs" button
9. [ ] Paste in Notepad
10. [ ] **VERIFY:** See your test messages

**Expected Output Format:**
```
=== CONSOLE LOGS (X messages) ===

[log] Testing 123
[error] Test error
[warning] Test warning
```

**✅ PASS / ❌ FAIL:** _________

---

## 🧪 Test 4: DOM Content Copy

**Website to test:** Any simple website

1. [ ] Open any website
2. [ ] Press F12
3. [ ] "Data Export" tab
4. [ ] Click "🌐 Copy DOM Content" button
5. [ ] Paste in Notepad
6. [ ] **VERIFY:** See HTML structure (`<html>`, `<body>`, etc.)

**Expected Output Format:**
```
=== DOM CONTENT ===

<!DOCTYPE html>
<html>
<head>...</head>
<body>...</body>
</html>
```

**✅ PASS / ❌ FAIL:** _________

---

## 🧪 Test 5: WebSocket Messages (Optional)

**Website to test:** https://www.websocket.org/echo.html

**IMPORTANT:** Open "Data Export" tab BEFORE connecting WebSocket!

1. [ ] Open https://www.websocket.org/echo.html
2. [ ] Press F12
3. [ ] Click **"Data Export"** tab FIRST
4. [ ] Now click "Connect" on the webpage
5. [ ] Send message: "Hello WebSocket"
6. [ ] Send message: "Testing 123"
7. [ ] Click "🔌 Copy WebSocket Messages" button
8. [ ] Paste in Notepad
9. [ ] **VERIFY:** See your sent/received messages

**Expected Output Format:**
```
=== WEBSOCKET MESSAGES (X messages) ===

Message #1:
Direction: Sent
Data: Hello WebSocket
Time: ...

Message #2:
Direction: Received
Data: Hello WebSocket
Time: ...
```

**✅ PASS / ❌ FAIL:** _________

---

## 🧪 Test 6: Redux State Copy (If You Have Redux)

**Website to test:** Your React app with Redux

**Setup Required:**
1. [ ] Add to your Redux store file: `window.store = store;`
2. [ ] Reload your app

**Test Steps:**
1. [ ] Open your app
2. [ ] Press F12
3. [ ] "Data Export" tab
4. [ ] Click "⚛️ Copy Redux State" button
5. [ ] Paste in Notepad
6. [ ] **VERIFY:** See your Redux state tree

**Expected Output Format:**
```
=== REDUX STATE ===

{
  "user": {...},
  "products": [...],
  ...
}
```

**✅ PASS / ❌ FAIL:** _________

**Skip this test if you don't use Redux**

---

## 🧪 Test 7: Copy EVERYTHING (Final Test)

**Website to test:** Your own website with active data

1. [ ] Open your website
2. [ ] Interact with it (click buttons, make API calls, etc.)
3. [ ] Press F12
4. [ ] "Data Export" tab
5. [ ] Click "⭐ Copy EVERYTHING" button
6. [ ] Paste in Notepad
7. [ ] **VERIFY:** See ALL sections combined:
   - Network Requests
   - Application Data
   - Console Logs
   - DOM Content
   - (WebSocket if any)
   - (Redux if any)

**✅ PASS / ❌ FAIL:** _________

---

## 🧪 Test 8: Statistics Display

1. [ ] Open any website
2. [ ] Press F12 → "Data Export" tab
3. [ ] Reload page to generate network traffic
4. [ ] **VERIFY** the stats at top show numbers:
   - Network Requests: X
   - WebSocket Messages: X
   - Console Logs: X
   - Total Size: X KB

**✅ PASS / ❌ FAIL:** _________

---

## 🧪 Test 9: Clear Data Button

1. [ ] After capturing data in "Data Export" tab
2. [ ] Note the statistics (e.g., "10 Network Requests")
3. [ ] Click "🗑️ Clear Data" button
4. [ ] **VERIFY:** Statistics reset to 0
5. [ ] Click copy buttons again
6. [ ] **VERIFY:** Shows "No data" or empty

**✅ PASS / ❌ FAIL:** _________

---

## 🧪 Test 10: Multiple Websites

Test that extension works across different sites:

1. [ ] Test on `https://jsonplaceholder.typicode.com/posts`
2. [ ] Test on `https://github.com`
3. [ ] Test on your localhost app
4. [ ] Test on `https://example.com`
5. [ ] **VERIFY:** Works on all sites

**✅ PASS / ❌ FAIL:** _________

---

## 📊 Quick Test Results Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Network Requests Copy | ⬜ Pass / Fail | |
| Application Data Copy | ⬜ Pass / Fail | |
| Console Logs Copy | ⬜ Pass / Fail | |
| DOM Content Copy | ⬜ Pass / Fail | |
| WebSocket Copy | ⬜ Pass / Fail / Skip | |
| Redux State Copy | ⬜ Pass / Fail / Skip | |
| Copy Everything | ⬜ Pass / Fail | |
| Statistics Display | ⬜ Pass / Fail | |
| Clear Data | ⬜ Pass / Fail | |
| Multiple Websites | ⬜ Pass / Fail | |

---

## 🔧 Common Issues & Fixes

### Issue: "Data Export" tab not visible
**Fix:** 
- Close DevTools (F12)
- Reopen DevTools (F12)
- Tab should appear now

### Issue: "No data captured" for Network
**Fix:**
- Open DevTools BEFORE loading the page
- Reload page (Ctrl+R)
- Network requests should capture now

### Issue: Copy button doesn't work
**Fix:**
- Check browser console for errors: F12 → Console tab → Look for red errors
- Try clicking the button again
- Check if clipboard permission was blocked

### Issue: Redux state shows "not found"
**Fix:**
- You need to add `window.store = store;` in your code
- See [REDUX_SETUP_GUIDE.md](REDUX_SETUP_GUIDE.md)
- Only works on sites YOU control

### Issue: Extension won't load
**Fix:**
- Check if PNG icons are in `icons/` folder
- Open [icon-generator.html](icon-generator.html) → Download icons
- Reload extension at `chrome://extensions/`

---

## ✅ Testing Complete?

If **7 out of 10 tests pass**, your extension is working well!

### Next Steps:

**If tests passed:**
- ✅ Use it locally as long as you want (FREE forever)
- ✅ Optional: Publish to Chrome Web Store later ($5 one-time fee)

**If tests failed:**
- Check "Common Issues & Fixes" section above
- Open browser console (F12 → Console) for error messages
- Report issue with specific test that failed

---

## 💡 Remember

- **Local testing is 100% FREE** - No payment ever needed
- **No time limit** - Test for days, weeks, months
- **Fully functional** - All features work locally
- **$5 fee is ONLY for publishing** to Chrome Web Store for public use

**You can use this extension locally forever without paying anything!** 🎉
