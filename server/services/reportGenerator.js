const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const ActivityLog = require('../models/ActivityLog');
const Student = require('../models/Student');
const Report = require('../models/Report');

/**
 * Generate a PDF report for a student within a date range.
 */
async function generateReport(studentId, startDate, endDate) {
  // Fetch student info
  const student = await Student.findOne({ studentId });
  if (!student) throw new Error('Student not found');

  // Fetch activity logs for the date range
  const logs = await ActivityLog.find({
    studentId,
    timestamp: { $gte: startDate, $lte: endDate }
  }).sort({ timestamp: 1 });

  // Calculate stats
  const tabSwitches = logs.filter(l => l.type === 'TAB_ACTIVITY').length;
  const socialMediaDetections = logs
    .filter(l => l.type === 'SOCIAL_MEDIA_ALERT')
    .map(l => ({ url: l.url, timestamp: l.timestamp }));

  // New behavioral metrics
  const copyPasteEvents = logs.filter(l => l.type === 'COPY_EVENT' || l.type === 'PASTE_EVENT');
  const copyPasteCount = copyPasteEvents.length;
  const copyPasteDetails = copyPasteEvents.map(l => ({
    type: l.type === 'COPY_EVENT' ? 'Copy' : 'Paste',
    text: l.rawData?.text || 'No text captured',
    time: l.timestamp
  }));
  
  const tabOutCount = logs.filter(l => l.type === 'TAB_BLUR').length;

  // Count site visits
  const siteCounts = {};
  logs.forEach(log => {
    if (log.url) {
      try {
        const hostname = new URL(log.url).hostname;
        siteCounts[hostname] = (siteCounts[hostname] || 0) + 1;
      } catch { /* skip invalid URLs */ }
    }
  });

  const topSites = Object.entries(siteCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([url, visitCount]) => ({ url, visitCount }));

  // Build activity timeline
  const activityTimeline = logs
    .filter(l => l.type === 'TAB_ACTIVITY')
    .map(l => ({
      time: l.timestamp,
      url: l.url,
      title: l.title,
      classification: l.classification
    }));

  // Create report directory
  const dateStr = startDate.toISOString().split('T')[0];
  const reportDir = path.join(
    process.env.REPORT_OUTPUT_DIR || './reports',
    studentId
  );
  fs.mkdirSync(reportDir, { recursive: true });

  const pdfPath = path.join(reportDir, `${dateStr}.pdf`);

  // Generate PDF
  await createPDF(student, startDate, endDate, {
    tabSwitches,
    socialMediaDetections,
    topSites,
    activityTimeline,
    copyPasteCount,
    copyPasteDetails,
    tabOutCount
  }, pdfPath);

  // Save report to DB
  const report = await Report.create({
    studentId,
    date: dateStr,
    generatedAt: new Date(),
    totalTabSwitches: tabSwitches,
    topSites,
    socialMediaDetections,
    activityTimeline,
    pdfPath
  });

  return report;
}

/**
 * Create the PDF file using pdfkit.
 */
function createPDF(student, startDate, endDate, stats, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    // ─── Cover Page ──────────────────────────────────────
    doc.fontSize(28)
      .fillColor('#2563EB')
      .text('Student Activity Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18)
      .fillColor('#1E293B')
      .text(student.name || 'Unknown Student', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12)
      .fillColor('#64748B')
      .text(`Report Period: ${startDate.toLocaleDateString()} — ${endDate.toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E2E8F0');
    doc.moveDown(1);

    // ─── Summary Stats ───────────────────────────────────
    doc.fontSize(16).fillColor('#1E293B').text('Summary Statistics');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#334155');
    doc.text(`Total Tab Switches: ${stats.tabSwitches}`);
    doc.text(`Social Media Detections: ${stats.socialMediaDetections.length}`);
    doc.text(`Unique Sites Visited: ${stats.topSites.length}`);
    doc.moveDown(0.5);
    doc.fillColor('#2563EB').text(`Browser Out-of-Focus Count: ${stats.tabOutCount}`);
    doc.text(`Copy/Paste Activity: ${stats.copyPasteCount} events`);
    doc.moveDown(1);

    // ─── Top Sites ───────────────────────────────────────
    doc.fontSize(16).fillColor('#1E293B').text('Top Visited Sites');
    doc.moveDown(0.5);
    
    if (stats.topSites.length > 0) {
      // Table header
      const tableTop = doc.y;
      doc.fontSize(10).fillColor('#64748B');
      doc.text('Site', 50, tableTop, { width: 350 });
      doc.text('Visits', 420, tableTop, { width: 80, align: 'right' });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E2E8F0');
      doc.moveDown(0.3);

      stats.topSites.forEach((site, i) => {
        const y = doc.y;
        if (y > 700) {
          doc.addPage();
        }
        doc.fontSize(10).fillColor('#334155');
        doc.text(`${i + 1}. ${site.url}`, 50, doc.y, { width: 350 });
        doc.text(`${site.visitCount}`, 420, doc.y - 12, { width: 80, align: 'right' });
        doc.moveDown(0.2);
      });
    } else {
      doc.fontSize(10).fillColor('#94A3B8').text('No site visits recorded.');
    }
    doc.moveDown(1);

    // ─── Social Media Detections ─────────────────────────
    doc.fontSize(16).fillColor('#DC2626').text('Social Media Detections');
    doc.moveDown(0.5);

    if (stats.socialMediaDetections.length > 0) {
      stats.socialMediaDetections.forEach(detection => {
        const y = doc.y;
        if (y > 700) doc.addPage();
        doc.fontSize(10).fillColor('#DC2626');
        doc.text(`⚠ ${detection.url}`, 50);
        doc.fontSize(9).fillColor('#94A3B8');
        doc.text(`  ${new Date(detection.timestamp).toLocaleString()}`);
        doc.moveDown(0.3);
      });
    } else {
      doc.fontSize(10).fillColor('#16A34A').text('✓ No social media activity detected.');
    }
    doc.moveDown(1);

    // ─── Copy/Paste Details ──────────────────────────────
    doc.fontSize(16).fillColor('#1E293B').text('Copy/Paste Audit');
    doc.moveDown(0.5);

    if (stats.copyPasteDetails.length > 0) {
      stats.copyPasteDetails.slice(0, 50).forEach(cp => {
        if (doc.y > 700) doc.addPage();
        doc.fontSize(9).fillColor('#334155').text(`${cp.type} (${new Date(cp.time).toLocaleTimeString()}):`, { continued: true });
        doc.fillColor('#64748B').text(` "${cp.text.substring(0, 100)}..."`);
        doc.moveDown(0.2);
      });
    } else {
      doc.fontSize(10).fillColor('#94A3B8').text('No copy/paste activity recorded.');
    }
    doc.moveDown(1);

    // ─── Activity Timeline ───────────────────────────────
    doc.addPage();
    doc.fontSize(16).fillColor('#1E293B').text('Activity Timeline');
    doc.moveDown(0.5);

    if (stats.activityTimeline.length > 0) {
      // Table header
      doc.fontSize(9).fillColor('#64748B');
      const headerY = doc.y;
      doc.text('Time', 50, headerY, { width: 80 });
      doc.text('Title', 135, headerY, { width: 200 });
      doc.text('Classification', 420, headerY, { width: 120 });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E2E8F0');
      doc.moveDown(0.3);

      stats.activityTimeline.forEach(entry => {
        if (doc.y > 700) doc.addPage();

        const classColors = {
          'EDUCATIONAL': '#16A34A',
          'SOCIAL_MEDIA': '#DC2626',
          'PRODUCTIVITY': '#2563EB',
          'OTHER': '#64748B'
        };

        const y = doc.y;
        doc.fontSize(8).fillColor('#334155');
        doc.text(new Date(entry.time).toLocaleTimeString(), 50, y, { width: 80 });
        doc.text((entry.title || 'Untitled').substring(0, 45), 135, y, { width: 270 });
        doc.fillColor(classColors[entry.classification] || '#64748B');
        doc.text(entry.classification, 420, y, { width: 120 });
        doc.moveDown(0.2);
      });
    } else {
      doc.fontSize(10).fillColor('#94A3B8').text('No activity recorded.');
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#94A3B8')
      .text('Generated by Student Activity Monitoring System', 50, doc.y, { align: 'center' });

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

module.exports = { generateReport };
