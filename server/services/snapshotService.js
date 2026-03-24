const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Snapshot = require('../models/Snapshot');

// ─── In-memory throttle map ─────────────────────────────────────────
// Key: `${studentId}_${mode}`, Value: last saved timestamp (ms)
const lastSavedAt = new Map();
const THROTTLE_MS = 10 * 1000; // 10 seconds

// Base directory for snapshot storage
const SNAPSHOTS_DIR = path.join(
  process.env.REPORT_OUTPUT_DIR || path.join(__dirname, '..', 'reports'),
  'snapshots'
);

// Ensure the snapshots directory exists on module load
fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

/**
 * Check if we should save a frame based on the throttle window.
 * @param {string} studentId
 * @param {string} mode - 'SCREEN' or 'CAMERA'
 * @returns {boolean}
 */
function shouldSave(studentId, mode) {
  const key = `${studentId}_${mode}`;
  const now = Date.now();
  const last = lastSavedAt.get(key) || 0;

  if (now - last < THROTTLE_MS) {
    return false;
  }

  lastSavedAt.set(key, now);
  return true;
}

/**
 * Save a base64-encoded frame to disk and create a Snapshot document.
 * Uses sharp to compress the image (JPEG quality 60).
 *
 * @param {string} studentId
 * @param {string} mode - 'SCREEN' or 'CAMERA'
 * @param {string} base64Frame - raw base64 string (may have data URI prefix)
 * @returns {Promise<object|null>} the created Snapshot document, or null if throttled
 */
async function saveFrame(studentId, mode, base64Frame) {
  // ── Throttle check ──────────────────────────────────────────────
  if (!shouldSave(studentId, mode)) {
    return null;
  }

  try {
    // Strip optional data-URI prefix  (e.g. "data:image/png;base64,")
    const raw = base64Frame.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(raw, 'base64');

    // ── Build file path ─────────────────────────────────────────
    const studentDir = path.join(SNAPSHOTS_DIR, studentId);
    fs.mkdirSync(studentDir, { recursive: true });

    const timestamp = Date.now();
    const filename = `${mode.toLowerCase()}_${timestamp}.jpg`;
    const filePath = path.join(studentDir, filename);

    // ── Compress with sharp (JPEG @ 60 quality) ─────────────────
    await sharp(buffer)
      .resize({ width: 1280, withoutEnlargement: true }) // cap max width
      .jpeg({ quality: 60 })
      .toFile(filePath);

    // ── Persist metadata to MongoDB ─────────────────────────────
    const relativePath = `/reports/snapshots/${studentId}/${filename}`;
    const snapshot = await Snapshot.create({
      studentId,
      mode,
      timestamp: new Date(timestamp),
      imagePath: relativePath,
      reportDate: new Date(new Date().setHours(0, 0, 0, 0))
    });

    console.log(`[Snapshot] Saved ${mode} frame for ${studentId}: ${filename}`);
    return snapshot;
  } catch (err) {
    console.error(`[Snapshot] Error saving ${mode} frame for ${studentId}:`, err.message);
    return null;
  }
}

/**
 * Fetch snapshots for a student within a date range, split by mode.
 *
 * @param {string} studentId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<{ screen: Array, camera: Array }>}
 */
async function getSnapshots(studentId, startDate, endDate) {
  const snapshots = await Snapshot.find({
    studentId,
    timestamp: { $gte: startDate, $lte: endDate }
  }).sort({ timestamp: 1 });

  return {
    screen: snapshots.filter(s => s.mode === 'SCREEN'),
    camera: snapshots.filter(s => s.mode === 'CAMERA')
  };
}

// ── Periodic cleanup of stale throttle entries ──────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of lastSavedAt.entries()) {
    if (now - ts > THROTTLE_MS * 6) { // 1 minute staleness
      lastSavedAt.delete(key);
    }
  }
}, 60_000);

module.exports = { saveFrame, getSnapshots };
