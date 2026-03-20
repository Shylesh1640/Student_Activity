// ─────────────────────────────────────────────────────────────
// Student Activity Monitor — Content Script
// Monitors copy/paste and user focus/blur
// ─────────────────────────────────────────────────────────────

// Listen for copy events
document.addEventListener('copy', (e) => {
  const selection = document.getSelection()?.toString();
  if (selection) {
    chrome.runtime.sendMessage({
      type: 'COPY_EVENT',
      text: selection.substring(0, 500) // Limit to 500 chars 
    });
  }
});

// Listen for paste events
document.addEventListener('paste', (e) => {
  const text = e.clipboardData?.getData('text');
  if (text) {
    chrome.runtime.sendMessage({
      type: 'PASTE_EVENT',
      text: text.substring(0, 500)
    });
  }
});

// Track when document becomes hidden (student tab/window switch)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    chrome.runtime.sendMessage({ type: 'TAB_BLUR' });
  } else {
    chrome.runtime.sendMessage({ type: 'TAB_FOCUS' });
  }
});
