const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  loginTime: {
    type: Date,
    required: true
  },
  logoutTime: {
    type: Date,
    default: Date.now
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  date: {
    type: String, // YYYY-MM-DD for easy querying
    required: true
  }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
