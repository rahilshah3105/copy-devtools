// Popup script

document.getElementById('openDevTools').addEventListener('click', () => {
  window.close(); // Close popup - user will manually open DevTools
});

document.getElementById('openHelp').addEventListener('click', () => {
  const helpText = `Network & WebSocket Copy Pro - Help Guide

📋 FEATURES:
• Copy all network requests with one click
• Export all WebSocket messages and frames
• View real-time statistics
• Privacy-focused (all data stays local)

🚀 HOW TO USE:
1. Open Chrome DevTools (F12 or Right-click → Inspect)
2. Navigate to the "WS Copy" tab in DevTools
3. Browse your application normally
4. Click "Copy All Network Requests" to export HTTP/HTTPS requests
5. Click "Copy WebSocket Messages" to export WebSocket data
6. Paste the copied data anywhere (text editor, documentation, etc.)

💡 TIPS:
• Keep DevTools open while using the application to capture data
• The extension captures data in real-time
• All data is stored locally and never sent to external servers
• Use "Clear Data" button to reset before starting a new capture session

🔒 PRIVACY:
This extension does not collect, store, or transmit any of your data to external servers. All processing happens locally in your browser.

⚙️ REQUIREMENTS:
• Chrome 88 or later
• DevTools must be open to capture network data

📝 EXPORT FORMAT:
The exported data includes:
• Request/Response URLs
• HTTP methods and status codes
• Headers (request and response)
• Request/Response bodies
• WebSocket frame data
• Timestamps and metadata

For more information or support, visit the Chrome Web Store page.`;
  
  alert(helpText);
});

// Display current version
chrome.runtime.getManifest().version;
