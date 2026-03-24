const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  alertType: {
    type: String,
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
  details: {
    type: String,
    default: ''
  },
  isAcknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedBy: {
    type: String,
    default: null
  }
});

alertSchema.index({ isAcknowledged: 1, timestamp: -1 });

module.exports = mongoose.model('Alert', alertSchema);
