const Alert = require('../models/Alert');

// ─── Debounce maps ─────────────────────────────────────────────────
// Social media: key = `${studentId}:${domain}`, value = last alert timestamp
const alertDebounce = new Map();
const DEBOUNCE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Camera permission: key = studentId, value = last alert timestamp
const cameraDebounce = new Map();
const CAMERA_DEBOUNCE_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Process a social media alert.
 * Creates an Alert document if not debounced (same student + domain within 5 min).
 * Returns the Alert document if created, null if debounced.
 */
async function processAlert(studentId, message) {
  const { url, title } = message;

  // Extract domain from URL
  let domain = '';
  try {
    domain = new URL(url).hostname.replace('www.', '');
  } catch {
    domain = url;
  }

  // Check debounce
  const debounceKey = `${studentId}:${domain}`;
  const lastAlert = alertDebounce.get(debounceKey);
  const now = Date.now();

  if (lastAlert && (now - lastAlert) < DEBOUNCE_WINDOW_MS) {
    console.log(`[Alert] Debounced alert for ${studentId} on ${domain}`);
    return null;
  }

  // Update debounce map
  alertDebounce.set(debounceKey, now);

  // Create alert document
  try {
    const alert = await Alert.create({
      studentId,
      timestamp: new Date(),
      alertType: 'SOCIAL_MEDIA',
      url: url || '',
      title: title || '',
      isAcknowledged: false
    });

    console.log(`[Alert] Created alert for ${studentId}: ${domain}`);
    return alert;
  } catch (err) {
    console.error('[Alert] Error creating alert:', err.message);
    return null;
  }
}

/**
 * Process a camera permission alert.
 * Creates an Alert document with type CAMERA_PERMISSION.
 *
 * @param {string} studentId
 * @param {string} errorMessage - the error/denial reason
 * @returns {Promise<object|null>} the Alert document if created
 */
async function processCameraAlert(studentId, errorMessage) {
  const now = Date.now();

  // Debounce per student
  const last = cameraDebounce.get(studentId) || 0;
  if (now - last < CAMERA_DEBOUNCE_MS) {
    console.log(`[Alert] Debounced camera alert for ${studentId}`);
    return null;
  }
  cameraDebounce.set(studentId, now);

  try {
    const alert = await Alert.create({
      studentId,
      timestamp: new Date(),
      alertType: 'CAMERA_PERMISSION',
      title: 'Camera permission denied',
      details: errorMessage || 'Student denied camera access',
      isAcknowledged: false
    });

    console.log(`[Alert] Camera permission alert created for ${studentId}`);
    return alert;
  } catch (err) {
    console.error('[Alert] Error creating camera alert:', err.message);
    return null;
  }
}

// ── Periodic cleanup of stale debounce entries ──────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of alertDebounce.entries()) {
    if (now - timestamp > DEBOUNCE_WINDOW_MS) {
      alertDebounce.delete(key);
    }
  }
  for (const [key, timestamp] of cameraDebounce.entries()) {
    if (now - timestamp > CAMERA_DEBOUNCE_MS) {
      cameraDebounce.delete(key);
    }
  }
}, 60000);

module.exports = { processAlert, processCameraAlert };
