const { Server } = require('socket.io');
const Student = require('../models/Student');
const ActivityLog = require('../models/ActivityLog');
const { processAlert, processCameraAlert } = require('./alertEngine');
const { saveFrame } = require('./snapshotService');

class WSHandler {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      // Increase max buffer for base64 frame payloads
      maxHttpBufferSize: 5e6 // 5 MB
    });

    this.studentSockets = new Map(); // studentId -> socketId

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('[WS] Socket.io server initialized');
  }

  handleConnection(socket) {
    const { studentId, role } = socket.handshake.query;

    if (role === 'admin') {
      this.handleAdminConnection(socket);
    } else if (studentId) {
      this.handleStudentConnection(socket, studentId);
    } else {
      console.log('[WS] Connection rejected: Missing studentId or role');
      socket.disconnect();
    }
  }

  handleAdminConnection(socket) {
    socket.join('admins');
    console.log(`[WS] Admin connected: ${socket.id}. Admins online: ${this.io.sockets.adapter.rooms.get('admins')?.size || 0}`);

    socket.on('disconnect', () => {
      console.log(`[WS] Admin disconnected: ${socket.id}`);
    });

    socket.on('error', (err) => {
      console.error('[WS] Admin connection error:', err.message);
    });

    // Handle admin commands (WebRTC signaling or stream requests)
    // Admin room setup
    socket.on('JOIN_STUDENT_WATCH', (data) => {
      const { studentId } = data;
      socket.join(`watch:${studentId}`);
      console.log(`[WS] Admin watching student: ${studentId}`);
    });

    socket.on('LEAVE_STUDENT_WATCH', (data) => {
      const { studentId } = data;
      socket.leave(`watch:${studentId}`);
      console.log(`[WS] Admin stopped watching: ${studentId}`);
    });

    socket.on('ADMIN_MESSAGE', (message) => {
      const { type, studentId } = message;
      // ... Forward as before
      if (['REQUEST_SCREEN', 'REQUEST_CAMERA', 'WEBRTC_OFFER', 'WEBRTC_ANSWER', 'WEBRTC_ICE_CANDIDATE', 'STOP_STREAM'].includes(type)) {
        this.sendToStudent(studentId, message);
      }
    });
  }

  async handleStudentConnection(socket, studentId) {
    // Check if student already connected
    const existingSocketId = this.studentSockets.get(studentId);
    if (existingSocketId) {
      const existingSocket = this.io.sockets.sockets.get(existingSocketId);
      if (existingSocket) {
        existingSocket.disconnect();
      }
    }

    this.studentSockets.set(studentId, socket.id);
    socket.join(`student:${studentId}`);
    
    console.log(`[WS] Student ${studentId} connected: ${socket.id}. Total students: ${this.studentSockets.size}`);

    // Update student online status
    await Student.findOneAndUpdate(
      { studentId },
      { isOnline: true, lastSeen: new Date() }
    );

    // Mark attendance (login) if not already marked for this session
    // Find if there's an open attendance record
    const Attendance = require('../models/Attendance');
    const existingAttendance = await Attendance.findOne({ 
      studentId, 
      logoutTime: { $exists: false } 
    }).sort({ loginTime: -1 });

    if (!existingAttendance) {
      const student = await Student.findOne({ studentId });
      if (student) {
        const today = new Date().toISOString().split('T')[0];
        await Attendance.create({
          studentId,
          name: student.name,
          loginTime: new Date(),
          date: today
        });
        console.log(`[WS] Attendance record created for student: ${studentId}`);
      }
    }

    // Notify admins
    this.broadcastToAdmins('STUDENT_ONLINE', {
      studentId,
      timestamp: new Date().toISOString()
    });

    socket.on('STUDENT_MESSAGE', (message) => {
      this.handleStudentMessage(studentId, message);
    });

    // ─── Handle stream frames: relay to watchers + save snapshot ──
    socket.on('STREAM_FRAME', (data) => {
      // Relay frame to admins watching this student (real-time view)
      this.io.to(`watch:${studentId}`).emit('STREAM_FRAME', {
        studentId,
        ...data
      });

      // Throttled save to disk (async, fire-and-forget)
      if (data.frame && data.mode) {
        saveFrame(studentId, data.mode, data.frame).catch(err => {
          console.error(`[WS] Snapshot save error for ${studentId}:`, err.message);
        });
      }
    });

    // ─── Handle camera permission status ─────────────────────────
    socket.on('CAMERA_STATUS', async (data) => {
      const { status, errorMessage } = data;

      if (status === 'denied' || status === 'error') {
        const alert = await processCameraAlert(studentId, errorMessage || 'Camera access denied');

        if (alert) {
          // Broadcast real-time alert to admin dashboard
          this.broadcastToAdmins('ALERT_CREATED', {
            alert: alert.toObject(),
            alertType: 'CAMERA_PERMISSION',
            studentId,
            title: alert.title,
            details: alert.details
          });
        }
      }
    });

    socket.on('disconnect', async () => {
      if (this.studentSockets.get(studentId) === socket.id) {
        this.studentSockets.delete(studentId);
        console.log(`[WS] Student ${studentId} disconnected. Total students: ${this.studentSockets.size}`);

        await Student.findOneAndUpdate(
          { studentId },
          { isOnline: false, lastSeen: new Date() }
        ).catch(err => console.error('[WS] Error updating student status:', err.message));

        this.broadcastToAdmins('STUDENT_OFFLINE', {
          studentId,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('error', (err) => {
      console.error(`[WS] Student ${studentId} error:`, err.message);
    });
  }

  async handleStudentMessage(studentId, message) {
    const { type } = message;

    // Update last seen
    Student.findOneAndUpdate(
      { studentId },
      { lastSeen: new Date() }
    ).catch(err => console.error('[WS] Error updating lastSeen:', err.message));

    // Save activity log
    if (['TAB_ACTIVITY', 'HISTORY_SNAPSHOT', 'SOCIAL_MEDIA_ALERT', 'STUDENT_STATUS', 'COPY_EVENT', 'PASTE_EVENT', 'TAB_BLUR', 'TAB_FOCUS'].includes(type)) {
      try {
        await ActivityLog.create({
          studentId,
          timestamp: message.timestamp || new Date(),
          type,
          url: message.url || '',
          title: message.title || '',
          classification: message.classification || 'OTHER',
          rawData: message
        });
      } catch (err) {
        console.error('[WS] Error saving activity log:', err.message);
      }
    }

    // Handle social media alerts
    if (type === 'SOCIAL_MEDIA_ALERT') {
      const alert = await processAlert(studentId, message);
      if (alert) {
        this.broadcastToAdmins('SOCIAL_MEDIA_ALERT', {
          alert: alert.toObject(),
          studentId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Forward all activity to admins for real-time dashboard
    this.broadcastToAdmins(message.type, {
      studentId,
      ...message,
      serverTimestamp: new Date().toISOString()
    });

    // Also wrap signaling messages for useWebRTC hook
    if (['WEBRTC_OFFER', 'WEBRTC_ANSWER', 'WEBRTC_ICE_CANDIDATE'].includes(type)) {
      this.broadcastToAdmins('SERVER_MESSAGE', {
        studentId,
        ...message,
        serverTimestamp: new Date().toISOString()
      });
    }
  }

  sendToStudent(studentId, message) {
    const socketId = this.studentSockets.get(studentId);
    if (socketId) {
      this.io.to(socketId).emit('SERVER_MESSAGE', message);
      return true;
    }
    return false;
  }

  broadcastToAdmins(event, data) {
    this.io.to('admins').emit(event, data);
  }

  getOnlineStudentIds() {
    return Array.from(this.studentSockets.keys());
  }

  getStats() {
    return {
      onlineStudents: this.studentSockets.size,
      connectedAdmins: this.io.sockets.adapter.rooms.get('admins')?.size || 0
    };
  }
}

module.exports = WSHandler;
