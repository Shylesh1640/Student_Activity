// ─────────────────────────────────────────────────────────────
// Student Activity Monitor — Popup Script
// ─────────────────────────────────────────────────────────────

const loginSection = document.getElementById('loginSection');
const mainSection = document.getElementById('mainSection');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

const nameDisplay = document.getElementById('nameDisplay');
const statusDot = document.getElementById('statusDot');
const connectionStatus = document.getElementById('connectionStatus');
const sessionStart = document.getElementById('sessionStart');
const tabSwitches = document.getElementById('tabSwitches');
const logoutBtn = document.getElementById('logoutBtn');

// ─── Load stored data ────────────────────────────────────────

async function logout() {
  const { studentId } = await chrome.storage.local.get('studentId');
  if (studentId) {
    try {
      await fetch('http://localhost:3000/api/student/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });
    } catch (e) { console.error('Logout API failed', e); }
  }
  
  await chrome.storage.local.clear();
  chrome.runtime.sendMessage({ type: 'STUDENT_LOGGED_OUT' });
  loadData();
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
}

async function loadData() {
  const data = await chrome.storage.local.get([
    'studentId', 'studentName', 'isConnected', 'sessionStartTime', 'tabSwitchCount'
  ]);

  if (data.studentId && data.studentName) {
    // Logged in
    loginSection.style.display = 'none';
    mainSection.style.display = 'block';
    nameDisplay.textContent = data.studentName;
    updateConnectionStatus(data.isConnected);
    
    if (data.sessionStartTime) {
      const start = new Date(data.sessionStartTime);
      sessionStart.textContent = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    tabSwitches.textContent = data.tabSwitchCount || 0;
  } else {
    // Not logged in
    loginSection.style.display = 'block';
    mainSection.style.display = 'none';
  }
}

function updateConnectionStatus(isConnected) {
  if (isConnected) {
    statusDot.classList.add('connected');
    connectionStatus.textContent = 'Connected';
    connectionStatus.className = 'stat-value online';
  } else {
    statusDot.classList.remove('connected');
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.className = 'stat-value offline';
  }
}

// ─── Form Logic ────────────────────────────────────────────

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  loginBtn.textContent = 'Connecting...';
  loginBtn.disabled = true;
  loginError.style.display = 'none';

  try {
    const res = await fetch('http://localhost:3000/api/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username, 
        password,
        extensionVersion: '1.0.0'
      })
    });

    const data = await res.json();

    if (data.success) {
      // Store credentials and details
      await chrome.storage.local.set({ 
        studentId: data.studentId,
        studentName: data.name,
        sessionStartTime: Date.now(),
        tabSwitchCount: 0
      });

      // Trigger background script to connect WebSockets
      chrome.runtime.sendMessage({ type: 'STUDENT_LOGGED_IN' });
      
      loadData();
    } else {
      loginError.style.display = 'block';
      loginError.textContent = data.error || 'Login failed';
    }
  } catch (err) {
    loginError.style.display = 'block';
    loginError.textContent = 'Cannot connect to Server';
  } finally {
    loginBtn.textContent = 'Connect to Server';
    loginBtn.disabled = false;
  }
});

// ─── Auto-refresh ────────────────────────────────────────────

// Listen for storage changes to update in real-time
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.isConnected) {
      updateConnectionStatus(changes.isConnected.newValue);
    }
    if (changes.tabSwitchCount) {
      tabSwitches.textContent = changes.tabSwitchCount.newValue;
    }
    if (changes.studentId) {
      loadData(); // Re-render logic if student logs in/out
    }
  }
});

// Load data on popup open
loadData();

