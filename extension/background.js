importScripts('socket.io.min.js');

const SERVER_URL = 'http://localhost:3000';

// Social media blocklist
const SOCIAL_MEDIA_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'tiktok.com', 'snapchat.com', 'youtube.com', 'reddit.com',
  'whatsapp.com', 'telegram.org'
];

// Classification rules
const EDUCATIONAL_PATTERNS = [
  'google.com/search', 'wikipedia.org', 'khanacademy.org',
  'coursera.org', 'edx.org', 'classroom.google.com'
];
const PRODUCTIVITY_PATTERNS = [
  'docs.google.com', 'sheets.google.com', 'slides.google.com',
  'office.live.com', 'office.com', 'notion.so'
];

let socket = null;
let tabSwitchCount = 0;

// ─── Initialization ──────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[SAM] Extension installed');

  // Set up alarms
  chrome.alarms.create('heartbeat', { periodInMinutes: 10 / 60 });
  chrome.alarms.create('historySnapshot', { periodInMinutes: 0.5 });

  const { studentId } = await chrome.storage.local.get('studentId');
  if (studentId) {
    connectSocket();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const { studentId } = await chrome.storage.local.get('studentId');
  if (studentId) {
    connectSocket();
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'STUDENT_LOGGED_IN') {
    connectSocket();
    return false;
  }

  if (message.type === 'STUDENT_LOGGED_OUT') {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    stopMediaCapture();
    return false;
  }

  if (message.type === 'COPY_EVENT' || message.type === 'PASTE_EVENT' || message.type === 'TAB_BLUR' || message.type === 'TAB_FOCUS') {
    const { studentId } = await chrome.storage.local.get('studentId');
    sendMessage({
      ...message,
      studentId,
      timestamp: new Date().toISOString()
    });
    return false;
  }

  if (message.target === 'background') {
    if (['WEBRTC_OFFER', 'WEBRTC_ICE_CANDIDATE', 'STREAM_FRAME'].includes(message.type)) {
      if (message.type === 'STREAM_FRAME') {
        socket?.emit('STREAM_FRAME', message);
      } else {
        sendMessage(message);
      }
    }
  }
  return false;
});

// ─── Socket.io Connection ────────────────────────────────────

async function connectSocket() {
  const { studentId } = await chrome.storage.local.get('studentId');
  if (!studentId) return;

  if (socket && socket.connected) return;

  console.log('[SAM] Connecting to Socket.io...');
  
  socket = io(SERVER_URL, {
    query: { studentId },
    transports: ['websocket'], // Force websocket to avoid polling issues in extension
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });

  socket.on('connect', async () => {
    console.log('[SAM] Socket.io connected');
    await chrome.storage.local.set({ isConnected: true });
    
    // Always start streaming on connect (as requested)
    startScreenShare();
    startCameraShare();
  });

  socket.on('SERVER_MESSAGE', (message) => {
    handleServerMessage(message);
  });

  socket.on('disconnect', async () => {
    console.log('[SAM] Socket.io disconnected');
    await chrome.storage.local.set({ isConnected: false });
  });

  socket.on('connect_error', (err) => {
    console.error('[SAM] Socket.io connection error:', err.message);
  });
}

function sendMessage(message) {
  if (socket && socket.connected) {
    socket.emit('STUDENT_MESSAGE', message);
  }
}

// ─── Server Message Handler ─────────────────────────────────

function handleServerMessage(message) {
  const { type } = message;

  switch (type) {
    case 'REQUEST_SCREEN':
      startScreenShare();
      break;
    case 'REQUEST_CAMERA':
      startCameraShare();
      break;
    case 'STOP_STREAM':
      stopMediaCapture();
      break;
    case 'WEBRTC_ANSWER':
    case 'WEBRTC_ICE_CANDIDATE':
      // Forward to offscreen document
      chrome.runtime.sendMessage({ ...message, target: 'offscreen' });
      break;
    default:
      console.log('[SAM] Unknown server message:', type);
  }
}

// ─── Tab Activity Monitoring ─────────────────────────────────

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      await processTabActivity(tab.url, tab.title);
      tabSwitchCount++;
      await chrome.storage.local.set({ tabSwitchCount });
    }
  } catch (err) {
    console.error('[SAM] Tab activated error:', err.message);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active && tab.url) {
    await processTabActivity(tab.url, tab.title);
  }
});

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0) { // Main frame only
    try {
      const tab = await chrome.tabs.get(details.tabId);
      if (tab.active && tab.url) {
        await processTabActivity(tab.url, tab.title);
      }
    } catch (err) {
      // Tab may have been closed
    }
  }
});

async function processTabActivity(url, title) {
  // Skip internal URLs
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return;

  const { studentId } = await chrome.storage.local.get('studentId');
  const classification = classifyUrl(url);

  // Send tab activity
  sendMessage({
    type: 'TAB_ACTIVITY',
    studentId,
    url,
    title: title || '',
    classification,
    timestamp: new Date().toISOString()
  });

  // Check for social media
  if (isSocialMedia(url)) {
    sendMessage({
      type: 'SOCIAL_MEDIA_ALERT',
      studentId,
      url,
      title: title || '',
      classification: 'SOCIAL_MEDIA',
      timestamp: new Date().toISOString()
    });
  }
}

// ─── URL Classification ─────────────────────────────────────

function classifyUrl(url) {
  const urlLower = url.toLowerCase();

  // Check educational
  if (EDUCATIONAL_PATTERNS.some(p => urlLower.includes(p))) return 'EDUCATIONAL';
  if (/\.edu(\/|$)/.test(urlLower)) return 'EDUCATIONAL';

  // Check social media
  if (isSocialMedia(url)) return 'SOCIAL_MEDIA';

  // Check productivity
  if (PRODUCTIVITY_PATTERNS.some(p => urlLower.includes(p))) return 'PRODUCTIVITY';

  return 'OTHER';
}

function isSocialMedia(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace('www.', '');
    return SOCIAL_MEDIA_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

// ─── Alarms (Heartbeat & History) ────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'heartbeat') {
    await sendHeartbeat();
  } else if (alarm.name === 'historySnapshot') {
    await sendHistorySnapshot();
  }
});

async function sendHeartbeat() {
  const { studentId } = await chrome.storage.local.get('studentId');
  if (!studentId) return;

  let activeTabUrl = '';
  let activeTabTitle = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      activeTabUrl = tab.url || '';
      activeTabTitle = tab.title || '';
    }
  } catch { /* ignore */ }

  const idleState = await chrome.idle.queryState(60);

  sendMessage({
    type: 'STUDENT_STATUS',
    studentId,
    timestamp: new Date().toISOString(),
    activeTabUrl,
    activeTabTitle,
    idleState
  });
}

async function sendHistorySnapshot() {
  const { studentId } = await chrome.storage.local.get('studentId');
  if (!studentId) return;

  try {
    const historyItems = await chrome.history.search({
      text: '',
      maxResults: 20,
      startTime: Date.now() - 30000
    });

    sendMessage({
      type: 'HISTORY_SNAPSHOT',
      studentId,
      timestamp: new Date().toISOString(),
      items: historyItems.map(item => ({
        url: item.url,
        title: item.title,
        lastVisitTime: item.lastVisitTime,
        visitCount: item.visitCount
      }))
    });
  } catch (err) {
    console.error('[SAM] History snapshot error:', err.message);
  }
}

// ─── Screen & Camera Sharing (Offscreen Document) ────────────

async function startScreenShare() {
  await createOffscreenDocumentIfNeeded();
  chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'START_SCREEN_SHARE'
  });
}

async function startCameraShare() {
  await createOffscreenDocumentIfNeeded();
  chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'START_CAMERA_SHARE'
  });
}

async function stopMediaCapture() {
  chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'STOP_CAPTURE'
  });
}

async function createOffscreenDocumentIfNeeded() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA', 'DISPLAY_MEDIA'],
    justification: 'Capture screen or camera for teacher monitoring'
  });
}


// ─── Keep alive / reconnect on wake ─────────────────────────
setInterval(() => {
  if (!socket || !socket.connected) {
    connectSocket();
  }
}, 25000);
