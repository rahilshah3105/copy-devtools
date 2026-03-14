// Create a DevTools panel
try {
  chrome.devtools.panels.create(
    "Data Export",
    "", // Empty icon path - not required
    "panel.html",
    function(panel) {
      if (chrome.runtime.lastError) {
        console.error("Error creating panel:", chrome.runtime.lastError);
      } else {
        console.log("✅ DevTools Data Exporter panel created successfully");
      }
    }
  );
} catch (error) {
  console.error("Failed to create DevTools panel:", error);
}

// Safely send messages to the extension runtime.
// During extension reloads, DevTools pages can stay alive briefly and throw
// "Extension context invalidated" if we send without guards.
function safeSendMessage(message) {
  try {
    if (!chrome.runtime || !chrome.runtime.id) {
      return;
    }

    chrome.runtime.sendMessage(message, () => {
      const err = chrome.runtime.lastError;
      if (!err) {
        return;
      }

      const errorText = String(err.message || err);
      if (
        errorText.includes('Extension context invalidated') ||
        errorText.includes('Receiving end does not exist') ||
        errorText.includes('The message port closed before a response was received')
      ) {
        // Expected when extension/panel reload timing overlaps.
        return;
      }

      console.warn('Runtime message error:', errorText);
    });
  } catch (error) {
    const errorText = String(error && error.message ? error.message : error);
    if (!errorText.includes('Extension context invalidated')) {
      console.warn('Failed to send runtime message:', errorText);
    }
  }
}

// Listen for network requests (this runs in DevTools context)
chrome.devtools.network.onRequestFinished.addListener(function(request) {
  safeSendMessage({
    type: 'networkRequest',
    data: request
  });
});
