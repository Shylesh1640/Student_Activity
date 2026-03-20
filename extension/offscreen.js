// ─────────────────────────────────────────────────────────────
// Student Activity Monitor — Offscreen Document
// Handles WebRTC peer connections for screen/camera sharing
// ─────────────────────────────────────────────────────────────

const STUN_SERVER = 'stun:stun.l.google.com:19302';
let screenStream = null;
let cameraStream = null;
let screenInterval = null;
let cameraInterval = null;

// ─── Message handler from background.js ──────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  switch (message.type) {
    case 'START_SCREEN_SHARE':
      startScreenCapture();
      break;
    case 'START_CAMERA_SHARE':
      startCameraCapture();
      break;
    case 'STOP_CAPTURE':
      stopCapture();
      break;
    case 'WEBRTC_ANSWER':
      handleWebRTCAnswer(message);
      break;
    case 'WEBRTC_ICE_CANDIDATE':
      handleICECandidate(message);
      break;
  }
});

// ─── Screen Capture ──────────────────────────────────────────

async function startScreenCapture() {
  try {
    if (screenStream) stopCapture('SCREEN');

    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 10 } }
    });

    startFrameCapture('SCREEN', screenStream);
    console.log('[Offscreen] Screen capture started');

    screenStream.getTracks().forEach(track => {
      track.onended = () => {
        alert("Screen sharing is REQUIRED for this session. Please reconnect.");
        stopCapture('SCREEN');
        startScreenCapture(); // Force retry
      };
    });
  } catch (err) {
    console.error('[Offscreen] Screen capture failed:', err.message);
    alert("Screen sharing is REQUIRED to continue. Please select a screen.");
    setTimeout(startScreenCapture, 2000); // Retry
  }
}

async function startCameraCapture() {
  try {
    const allowCamera = confirm("Your teacher has requested camera access. Allow camera recording?");
    if (!allowCamera) {
      console.log('[Offscreen] Camera access denied by student');
      return;
    }

    if (cameraStream) stopCapture('CAMERA');

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 10 } },
      audio: false
    });

    startFrameCapture('CAMERA', cameraStream);
    console.log('[Offscreen] Camera capture started');
  } catch (err) {
    console.error('[Offscreen] Camera capture failed:', err.message);
  }
}

// ─── Frame Capture (Socket.io Streaming) ────────────────────

function startFrameCapture(mode, stream) {
  const isScreen = mode === 'SCREEN';
  if (isScreen && screenInterval) clearInterval(screenInterval);
  if (!isScreen && cameraInterval) clearInterval(cameraInterval);
  
  const videoId = `capture-video-${mode.toLowerCase()}`;
  let video = document.getElementById(videoId);
  if (!video) {
    video = document.createElement('video');
    video.id = videoId;
    video.muted = true;
    video.playsInline = true;
    video.style.display = 'none';
    document.body.appendChild(video);
  }

  video.srcObject = stream;
  video.play().catch(e => console.error(`[Offscreen] Video play error for ${mode}:`, e));

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  const interval = setInterval(() => {
    if (!stream || !stream.active) {
      clearInterval(interval);
      return;
    }

    if (video.videoWidth > 0) {
      canvas.width = isScreen ? 800 : 480; 
      canvas.height = (canvas.width / video.videoWidth) * video.videoHeight;
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameData = canvas.toDataURL('image/jpeg', 0.4);

      chrome.runtime.sendMessage({
        target: 'background',
        type: 'STREAM_FRAME',
        mode: mode,
        frame: frameData,
        timestamp: new Date().toISOString()
      });
    }
  }, isScreen ? 400 : 600); // Efficient FPS (2.5 screen, ~1.5 camera)

  if (isScreen) screenInterval = interval;
  else cameraInterval = interval;
}
// ─── Cleanup ─────────────────────────────────────────────────

function stopCapture(mode) {
  if (!mode || mode === 'SCREEN') {
    if (screenInterval) {
      clearInterval(screenInterval);
      screenInterval = null;
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      screenStream = null;
    }
    const v = document.getElementById('capture-video-screen');
    if (v) v.remove();
    console.log('[Offscreen] Screen capture stopped');
  }

  if (!mode || mode === 'CAMERA') {
    if (cameraInterval) {
      clearInterval(cameraInterval);
      cameraInterval = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    const v = document.getElementById('capture-video-camera');
    if (v) v.remove();
    console.log('[Offscreen] Camera capture stopped');
  }
}

// ─── WebRTC (Legacy / Per Stream) ────────────────────────────

async function handleWebRTCAnswer(message) {
  // Signaling is more complex with two streams. 
  // For "stream always", we focus on Socket.io frames.
}

async function handleICECandidate(message) {
  // ... 
}
