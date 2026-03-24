const Student = require('../models/Student');
const ActivityLog = require('../models/ActivityLog');
const Alert = require('../models/Alert');
const Attendance = require('../models/Attendance');
const Report = require('../models/Report');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getSnapshots } = require('../services/snapshotService');

/**
 * Admin Login
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // required for sameSite: 'none'
      sameSite: 'none', // required for cross-origin Vercel to Render communication
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        username: admin.username
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

/**
 * Get all students
 */
async function getStudents(req, res) {
  try {
    const students = await Student.find().sort({ lastSeen: -1 });
    res.json(students);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
}

/**
 * Get student logs
 */
async function getStudentLogs(req, res) {
  try {
    const { id } = req.params;
    const { limit = 100, skip = 0 } = req.query;
    
    const logs = await ActivityLog.find({ studentId: id })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    res.json(logs);
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
}

/**
 * Get student alerts
 */
async function getStudentAlerts(req, res) {
  try {
    const { id } = req.params;
    const alerts = await Alert.find({ studentId: id }).sort({ timestamp: -1 });
    res.json(alerts);
  } catch (err) {
    console.error('Error fetching student alerts:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
}

/**
 * Generate Student Report
 * 
 * FIX: Now reads startDate and endDate from req.body instead of
 *      hardcoding "today". Falls back to today if not provided.
 */
async function generateStudentReport(req, res) {
  try {
    const { id } = req.params;
    const student = await Student.findOne({ studentId: id });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // ── Read date range from request body ─────────────────────────
    let startOfDay, endOfDay;

    if (req.body.startDate && req.body.endDate) {
      startOfDay = new Date(req.body.startDate);
      endOfDay = new Date(req.body.endDate);
      // Ensure endOfDay includes the full day
      if (endOfDay.getHours() === 0 && endOfDay.getMinutes() === 0) {
        endOfDay.setHours(23, 59, 59, 999);
      }
    } else {
      // Fallback: today
      startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
    }

    const dateLabel = startOfDay.toISOString().split('T')[0];

    const logs = await ActivityLog.find({
      studentId: id,
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ timestamp: 1 });

    const alerts = await Alert.find({
      studentId: id,
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    });

    // ── Fetch snapshots for the date range ────────────────────────
    const snapshots = await getSnapshots(id, startOfDay, endOfDay);

    // Enhanced Analysis
    const totalTabSwitches = logs.filter(l => l.type === 'TAB_ACTIVITY').length;
    const tabBlurs = logs.filter(l => l.type === 'TAB_BLUR').length;
    const copyCount = logs.filter(l => l.type === 'COPY_EVENT').length;
    const pasteCount = logs.filter(l => l.type === 'PASTE_EVENT').length;
    
    // Search detection
    const searchQueries = [];
    logs.forEach(l => {
      if (l.type === 'TAB_ACTIVITY' && l.url) {
        const urlObj = l.url.toLowerCase();
        if (urlObj.includes('google.com/search') || urlObj.includes('bing.com/search') || urlObj.includes('duckduckgo.com/?q=')) {
          try {
            const url = new URL(l.url);
            const query = url.searchParams.get('q') || url.searchParams.get('query');
            if (query) searchQueries.push({ query, time: l.timestamp });
          } catch (e) {
            // fallback if URL parsing fails
            if (l.title && l.title.includes(' - Google Search')) {
              searchQueries.push({ query: l.title.replace(' - Google Search', ''), time: l.timestamp });
            }
          }
        }
      }
    });
    const searchCount = searchQueries.length;

    // Top Sites
    const siteCounts = {};
    logs.filter(l => l.type === 'TAB_ACTIVITY').forEach(l => {
      if (l.url) {
        try {
          const dom = new URL(l.url).hostname;
          siteCounts[dom] = (siteCounts[dom] || 0) + 1;
        } catch {
          siteCounts[l.url] = (siteCounts[l.url] || 0) + 1;
        }
      }
    });

    const topSites = Object.entries(siteCounts)
      .map(([url, visitCount]) => ({ url, visitCount }))
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 10);

    // Social Media detections
    const socialMediaDetections = alerts
      .filter(a => a.alertType === 'SOCIAL_MEDIA')
      .map(a => ({ url: a.url, timestamp: a.timestamp }));

    // Activity Timeline (Filtered to distinct views to keep report readable)
    const activityTimeline = [];
    let lastUrl = '';
    logs.filter(l => l.type === 'TAB_ACTIVITY').forEach(l => {
      if (l.url !== lastUrl) {
        activityTimeline.push({
          time: l.timestamp,
          url: l.url,
          title: l.title,
          classification: l.classification
        });
        lastUrl = l.url;
      }
    });

    // Generate PDF
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

    const filename = `report_${id}_${Date.now()}.pdf`;
    const pdfPath = path.join(reportsDir, filename);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // ─────────────────────────────────────────────────────────────
    // PDF CONTENT
    // ─────────────────────────────────────────────────────────────

    // PDF Header
    doc.fontSize(22).fillColor('#1e40af').text('Student Activity Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#64748b').text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Student Information Section
    doc.fontSize(14).fillColor('#0f172a').text('Student Profile');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#334155').text(`Name: ${student.name}`);
    doc.text(`Student ID: ${id}`);
    doc.text(`Report Period: ${startOfDay.toLocaleDateString()} — ${endOfDay.toLocaleDateString()}`);
    doc.moveDown(1.5);

    // Statistics Grid
    doc.fontSize(14).fillColor('#0f172a').text('Activity Metrics');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.8);
    
    const statsY = doc.y;
    doc.fontSize(10).fillColor('#64748b').text('Tab Switches:', 50, statsY);
    doc.fillColor('#0f172a').text(totalTabSwitches.toString(), 150, statsY);
    
    doc.fillColor('#64748b').text('Exited Browser:', 300, statsY);
    doc.fillColor('#ef4444').text(tabBlurs.toString(), 400, statsY);
    
    doc.moveDown(0.5);
    const statsY2 = doc.y;
    doc.fillColor('#64748b').text('Search Queries:', 50, statsY2);
    doc.fillColor('#0f172a').text(searchCount.toString(), 150, statsY2);
    
    doc.fillColor('#64748b').text('Social Media:', 300, statsY2);
    doc.fillColor(socialMediaDetections.length > 0 ? '#ef4444' : '#0f172a').text(socialMediaDetections.length.toString(), 400, statsY2);

    doc.moveDown(0.5);
    const statsY3 = doc.y;
    doc.fillColor('#64748b').text('Copy Events:', 50, statsY3);
    doc.fillColor('#0f172a').text(copyCount.toString(), 150, statsY3);
    
    doc.fillColor('#64748b').text('Paste Events:', 300, statsY3);
    doc.fillColor('#0f172a').text(pasteCount.toString(), 400, statsY3);

    doc.moveDown(0.5);
    const statsY4 = doc.y;
    doc.fillColor('#64748b').text('Screen Captures:', 50, statsY4);
    doc.fillColor('#0f172a').text(snapshots.screen.length.toString(), 150, statsY4);
    
    doc.fillColor('#64748b').text('Camera Captures:', 300, statsY4);
    doc.fillColor('#0f172a').text(snapshots.camera.length.toString(), 400, statsY4);
    
    doc.moveDown(2);

    // Search Queries List
    if (searchQueries.length > 0) {
      doc.fontSize(14).fillColor('#0f172a').text('Recent Searches');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.5);
      searchQueries.slice(0, 10).forEach(s => {
        doc.fontSize(10).fillColor('#334155').text(`• "${s.query}"`, { indent: 15 });
        doc.fontSize(8).fillColor('#94a3b8').text(`  at ${new Date(s.time).toLocaleTimeString()}`, { indent: 15 });
      });
      doc.moveDown(1.5);
    }

    // Top Sites Section
    doc.fontSize(14).fillColor('#0f172a').text('Most Visited Domains');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);
    topSites.forEach(site => {
      doc.fontSize(10).fillColor('#334155').text(`${site.url}:`, { continued: true, indent: 15 });
      doc.fillColor('#64748b').text(` ${site.visitCount} visits`);
    });
    doc.moveDown(1.5);

    // Timeline Section
    doc.fontSize(14).fillColor('#0f172a').text('Navigation Timeline (Tabs Viewed)');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);
    activityTimeline.slice(-30).forEach(log => {
      if (doc.y > 700) doc.addPage();
      const time = new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      doc.fontSize(9).fillColor('#64748b').text(`${time} - `, { continued: true, indent: 15 });
      doc.fillColor('#0f172a').text(log.title ? log.title.substring(0, 70) : 'Untitled Tab');
      doc.fontSize(7).fillColor('#3b82f6').text(`  ${log.url.substring(0, 100)}${log.url.length > 100 ? '...' : ''}`, { indent: 15 });
      doc.moveDown(0.2);
    });

    // ─────────────────────────────────────────────────────────────
    // SNAPSHOT IMAGES SECTION — ALL images, paginated 2 per page
    // ─────────────────────────────────────────────────────────────
    const IMAGE_WIDTH = 400;
    const IMAGE_HEIGHT = 250;
    const IMAGES_PER_PAGE = 2;

    /**
     * Helper: insert all snapshot images of a given mode into the PDF.
     * Paginates at 2 images per page and handles missing files safely.
     */
    function insertSnapshotSection(sectionTitle, snapshotList) {
      if (snapshotList.length === 0) return;

      doc.addPage();
      doc.fontSize(18).fillColor('#1e40af').text(sectionTitle, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#64748b').text(`${snapshotList.length} image(s) captured`, { align: 'center' });
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(1);

      let imagesOnPage = 0;

      for (let i = 0; i < snapshotList.length; i++) {
        const snap = snapshotList[i];

        // Resolve absolute path from relative path
        const absPath = path.join(__dirname, '..', snap.imagePath);

        // Skip if the file does not exist
        if (!fs.existsSync(absPath)) {
          console.warn(`[PDF] Missing snapshot file: ${absPath}`);
          continue;
        }

        // Paginate: start a new page after every 2 images
        if (imagesOnPage >= IMAGES_PER_PAGE) {
          doc.addPage();
          imagesOnPage = 0;
        }

        // Timestamp label
        const timeLabel = new Date(snap.timestamp).toLocaleString();
        doc.fontSize(9).fillColor('#334155').text(`📸 ${timeLabel}`, 50);
        doc.moveDown(0.3);

        try {
          doc.image(absPath, 50, doc.y, {
            width: IMAGE_WIDTH,
            height: IMAGE_HEIGHT,
            fit: [IMAGE_WIDTH, IMAGE_HEIGHT],
            align: 'center'
          });
          doc.moveDown(0.2);
          // Move cursor past the image
          doc.y += IMAGE_HEIGHT + 10;
        } catch (imgErr) {
          console.error(`[PDF] Error embedding image ${absPath}:`, imgErr.message);
          doc.fontSize(9).fillColor('#ef4444').text(`  [Image could not be loaded: ${snap.imagePath}]`);
        }

        doc.moveDown(0.5);
        imagesOnPage++;
      }
    }

    // Insert screen captures
    insertSnapshotSection('Screen Captures', snapshots.screen);

    // Insert camera captures
    insertSnapshotSection('Camera Captures', snapshots.camera);

    // Footer
    doc.addPage();
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#94a3b8')
      .text('Generated by Student Activity Monitoring System', 50, doc.y, { align: 'center' });

    doc.end();
    await new Promise((resolve) => stream.on('finish', resolve));

    // Save to Database
    const report = await Report.create({
      studentId: id,
      date: dateLabel,
      totalTabSwitches,
      searchCount,
      tabBlurs,
      copyCount,
      pasteCount,
      topSites,
      socialMediaDetections,
      activityTimeline,
      pdfPath: `/reports/${filename}`
    });

    res.json(report);
  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

/**
 * Download Report
 */
async function downloadReport(req, res) {
  try {
    const { reportId } = req.params;
    const report = await Report.findById(reportId);
    if (!report || !report.pdfPath) return res.status(404).json({ error: 'Report not found' });

    const fullPath = path.join(__dirname, '..', report.pdfPath);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found on disk' });

    res.download(fullPath);
  } catch (err) {
    console.error('Download report error:', err);
    res.status(500).json({ error: 'Failed to download report' });
  }
}

/**
 * Get all reports for a student
 */
async function getStudentReports(req, res) {
  try {
    const { id } = req.params;
    const reports = await Report.find({ studentId: id }).sort({ generatedAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
}

/**
 * Get all alerts
 */
async function getAllAlerts(req, res) {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(100);
    // Enrich with student names
    const enrichedAlerts = await Promise.all(alerts.map(async alert => {
      const student = await Student.findOne({ studentId: alert.studentId }).select('name');
      return {
        ...alert.toObject(),
        studentName: student ? student.name : 'Unknown'
      };
    }));
    res.json(enrichedAlerts);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
}

/**
 * Acknowledge an alert
 */
async function acknowledgeAlert(req, res) {
  try {
    const { id } = req.params;
    const alert = await Alert.findByIdAndUpdate(id, { isAcknowledged: true }, { new: true });
    res.json(alert);
  } catch (err) {
    console.error('Error acknowledging alert:', err);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
}

/**
 * Acknowledge all alerts
 */
async function acknowledgeAllAlerts(req, res) {
  try {
    await Alert.updateMany({ isAcknowledged: false }, { isAcknowledged: true });
    res.json({ success: true, message: 'All alerts acknowledged' });
  } catch (err) {
    console.error('Error acknowledging all alerts:', err);
    res.status(500).json({ error: 'Failed to acknowledge alerts' });
  }
}

/**
 * Send command to student
 */
async function sendCommand(req, res) {
  try {
    const { studentId, command } = req.body;
    if (!studentId || !command) return res.status(400).json({ error: 'studentId and command required' });

    const wsHandler = req.app.get('wsHandler');
    if (!wsHandler) return res.status(500).json({ error: 'WS Handler not initialized' });

    const success = wsHandler.sendToStudent(studentId, {
      type: command,
      studentId,
      timestamp: new Date().toISOString()
    });
    if (success) {
      res.json({ success: true, message: 'Command sent' });
    } else {
      res.status(404).json({ error: 'Student offline' });
    }
  } catch (err) {
    console.error('Error sending command:', err);
    res.status(500).json({ error: 'Failed to send command' });
  }
}

/**
 * Change admin password
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id);

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) return res.status(401).json({ error: 'Current password incorrect' });

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
}

/**
 * Create a new student (admin task)
 */
async function createStudent(req, res) {
  try {
    const { name, username, password, studentId } = req.body;
    
    // Check if exists
    const existing = await Student.findOne({ 
      $or: [{ username }, { studentId }] 
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Student with this username or ID already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStudent = await Student.create({
      name,
      username,
      password: hashedPassword,
      studentId: studentId || `STU-${Date.now().toString().slice(-6)}`
    });

    res.status(201).json({
      success: true,
      studentId: newStudent.studentId,
      name: newStudent.name
    });
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ error: 'Failed to create student' });
  }
}

/**
 * Update student data (e.g. notes)
 */
async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    const { name, notes } = req.body;
    
    const updatedStudent = await Student.findOneAndUpdate(
      { studentId: id },
      { $set: { name, notes } },
      { new: true }
    );

    if (!updatedStudent) return res.status(404).json({ error: 'Student not found' });

    res.json(updatedStudent);
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ error: 'Failed to update student' });
  }
}

/**
 * Delete student account and all related data
 */
async function deleteStudent(req, res) {
  try {
    const { id } = req.params;
    
    const student = await Student.findOne({ studentId: id });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Delete related records
    await ActivityLog.deleteMany({ studentId: id });
    await Alert.deleteMany({ studentId: id });
    await Attendance.deleteMany({ studentId: id });
    await Report.deleteMany({ studentId: id });
    
    // Also clean up snapshots
    const Snapshot = require('../models/Snapshot');
    await Snapshot.deleteMany({ studentId: id });

    // Delete student record
    await Student.deleteOne({ studentId: id });

    res.json({ success: true, message: `Student ${id} and all related data deleted successfully` });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
}

module.exports = {
  login,
  getStudents,
  getStudentLogs,
  getStudentAlerts,
  generateStudentReport,
  downloadReport,
  getStudentReports,
  getAllAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  sendCommand,
  changePassword,
  createStudent,
  updateStudent,
  deleteStudent
};