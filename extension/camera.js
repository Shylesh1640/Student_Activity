// Camera Feed Script
const videoElement = document.getElementById('cameraFeed');
const statusElement = document.getElementById('cameraStatus');
const closeBtn = document.getElementById('closeBtn');

async function initializeCamera() {
  try {
    console.log('[Camera] Requesting camera access with real camera preference...');
    statusElement.innerHTML = '<div class="spinner"></div><p>Waiting for camera permission...</p>';

    // Request camera with explicit preference for user-facing camera (not virtual)
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user"  // Prefer real camera, not virtual
      },
      audio: false
    });

    console.log('✅ Camera access granted');
    
    // Check if it's a real camera vs virtual
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      const settings = videoTracks[0].getSettings();
      console.log('[Camera] Camera track:', videoTracks[0].label, 'Resolution:', settings.width, 'x', settings.height);
    }

    // Attach stream to video element
    videoElement.srcObject = stream;
    videoElement.style.display = 'block';
    statusElement.style.display = 'none';

    // Save permission state
    await chrome.storage.local.set({
      cameraPermission: 'granted',
      cameraStreamActive: true,
      cameraPermissionError: ''
    });

    console.log('[Camera] Camera stream is live and permission saved');

    // Keep track of stream for cleanup
    window.cameraStream = stream;

    // Listen for stream end to update status
    stream.getTracks().forEach(track => {
      track.onended = () => {
        console.log('[Camera] Camera track ended');
        statusElement.innerHTML = '<p style="color: #ef4444;">Camera stopped</p>';
        statusElement.style.display = 'flex';
        videoElement.style.display = 'none';
      };
    });

  } catch (err) {
    console.error('[Camera] Camera initialization failed:', err.name, err.message);

    let errorMessage = 'Camera initialization failed';
    let suggestion = '';

    if (err.name === 'NotAllowedError') {
      errorMessage = 'Camera permission was denied';
      suggestion = 'Please allow camera access when prompted by Chrome';
    } else if (err.name === 'NotReadableError') {
      errorMessage = 'Camera is in use by another application';
      suggestion = 'Close other programs using your camera and refresh';
    } else if (err.name === 'AbortError') {
      errorMessage = 'Camera access was aborted';
      suggestion = 'Try refreshing the page';
    } else if (err.name === 'SecurityError') {
      errorMessage = 'Camera access is blocked by security policy';
      suggestion = 'Check your browser privacy settings';
    } else {
      suggestion = err.message;
    }

    statusElement.innerHTML = `
      <p style="color: #ef4444; font-weight: 600;">${errorMessage}</p>
      <p style="font-size: 11px; color: #888; margin-top: 8px;">${suggestion}</p>
    `;
    statusElement.style.display = 'flex';
    videoElement.style.display = 'none';

    await chrome.storage.local.set({
      cameraPermission: err.name === 'NotAllowedError' ? 'denied' : 'error',
      cameraStreamActive: false,
      cameraPermissionError: err.message
    });
  }
}

// Close button handler
closeBtn.addEventListener('click', () => {
  if (window.cameraStream) {
    window.cameraStream.getTracks().forEach(track => track.stop());
  }
  window.close();
});

// Initialize camera when page loads
initializeCamera();

// Graceful cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.cameraStream) {
    window.cameraStream.getTracks().forEach(track => track.stop());
  }
});
