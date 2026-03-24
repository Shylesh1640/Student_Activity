const mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    index: true
  },
  mode: {
    type: String,
    enum: ['SCREEN', 'CAMERA'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  imagePath: {
    type: String,
    required: true
  },
  reportDate: {
    type: Date,
    default: () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
});

// Compound index for efficient date-range + student queries
snapshotSchema.index({ studentId: 1, reportDate: -1 });
snapshotSchema.index({ studentId: 1, mode: 1, timestamp: -1 });

module.exports = mongoose.model('Snapshot', snapshotSchema);
