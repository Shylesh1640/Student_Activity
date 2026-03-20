const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  totalTabSwitches: {
    type: Number,
    default: 0
  },
  searchCount: {
    type: Number,
    default: 0
  },
  tabBlurs: {
    type: Number,
    default: 0
  },
  copyCount: {
    type: Number,
    default: 0
  },
  pasteCount: {
    type: Number,
    default: 0
  },
  topSites: [{
    url: String,
    visitCount: Number
  }],
  socialMediaDetections: [{
    url: String,
    timestamp: Date
  }],
  activityTimeline: [{
    time: Date,
    url: String,
    title: String,
    classification: String
  }],
  pdfPath: {
    type: String,
    default: ''
  }
});

reportSchema.index({ studentId: 1, date: -1 });

module.exports = mongoose.model('Report', reportSchema);
