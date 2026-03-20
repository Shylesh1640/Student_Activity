const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const bcrypt = require('bcryptjs');

async function loginStudent(req, res) {
  try {
    const { username, password, extensionVersion } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const student = await Student.findOne({ username });
    if (!student) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last seen and version
    student.lastSeen = new Date();
    student.isOnline = true;
    if (extensionVersion) student.extensionVersion = extensionVersion;
    await student.save();

    // Mark attendance (login)
    const today = new Date().toISOString().split('T')[0];
    await Attendance.create({
      studentId: student.studentId,
      name: student.name,
      loginTime: new Date(),
      date: today
    });

    res.status(200).json({
      success: true,
      studentId: student.studentId,
      name: student.name,
      username: student.username
    });
  } catch (err) {
    console.error('Error logging in student:', err);
    res.status(500).json({ error: 'Failed to login student' });
  }
}

async function logoutStudent(req, res) {
  try {
    const { studentId } = req.body;
    
    // Find the latest incomplete attendance record for today
    const attendance = await Attendance.findOne({ 
      studentId, 
      logoutTime: { $exists: false } 
    }).sort({ loginTime: -1 });

    if (attendance) {
      attendance.logoutTime = new Date();
      // Calculate duration in minutes
      const duration = (attendance.logoutTime - attendance.loginTime) / (1000 * 60);
      attendance.durationMinutes = Math.round(duration);
      await attendance.save();
    }

    // Update status
    await Student.findOneAndUpdate({ studentId }, { isOnline: false });

    res.json({ success: true, message: 'Logout successful, attendance marked.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Failed to logout' });
  }
}

module.exports = { loginStudent, logoutStudent };
