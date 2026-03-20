const Alert = require('../models/Alert');

// Debounce map: key = `${studentId}:${domain}`, value = last alert timestamp
const alertDebounce = new Map();
const DEBOUNCE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

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

// Clean up old debounce entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of alertDebounce.entries()) {
    if (now - timestamp > DEBOUNCE_WINDOW_MS) {
      alertDebounce.delete(key);
    }
  }
}, 60000); // Clean up every minute

module.exports = { processAlert };
