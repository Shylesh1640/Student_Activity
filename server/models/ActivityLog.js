const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  type: {
    type: String,
    enum: ['TAB_ACTIVITY', 'HISTORY_SNAPSHOT', 'SOCIAL_MEDIA_ALERT', 'STUDENT_STATUS', 'COPY_EVENT', 'PASTE_EVENT', 'TAB_BLUR', 'TAB_FOCUS'],
    required: true
  },
  url: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  classification: {
    type: String,
    enum: ['EDUCATIONAL', 'SOCIAL_MEDIA', 'PRODUCTIVITY', 'OTHER'],
    default: 'OTHER'
  },
  rawData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

activityLogSchema.index({ studentId: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
