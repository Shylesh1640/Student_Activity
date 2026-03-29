const mongoose = require('mongoose');

const routineEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 60,
    trim: true
  },
  day: {
    type: Number,
    required: true,
    min: 0,
    max: 6  // 0=Sunday … 6=Saturday
  },
  startH: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  endH: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  notes: {
    type: String,
    default: '',
    maxlength: 80
  },
  bg: {
    type: String,
    default: '#4f98a3'
  },
  fg: {
    type: String,
    default: '#fff'
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

// Index for fast lookup by admin
routineEventSchema.index({ adminId: 1, day: 1 });

module.exports = mongoose.model('RoutineEvent', routineEventSchema);
