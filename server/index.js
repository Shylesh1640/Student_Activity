require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const dns = require('dns');

// Override local DNS to fix 'querySrv ECONNREFUSED' when connecting to MongoDB Atlas
dns.setServers(['8.8.8.8', '8.8.4.4']);

const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const WSHandler = require('./services/wsHandler');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    callback(null, true); // Allow any local IP origin
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Serve static reports
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Routes
app.use('/api', studentRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const wsHandler = app.get('wsHandler');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ...wsHandler?.getStats()
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student_activity';

const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('[DB] Connected to MongoDB');

    // Seed default admin
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({ username: 'admin', password: hashedPassword });
      console.log('[DB] Default admin user created (admin / admin123)');
    }

    // Initialize WebSocket handler
    const wsHandler = new WSHandler(server);
    app.set('wsHandler', wsHandler);

    server.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[WS] WebSocket server on ws://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('[DB] MongoDB connection error:', err.message);
    console.log('[Server] Starting without database...');

    // Start server without DB for development/testing
    const wsHandler = new WSHandler(server);
    app.set('wsHandler', wsHandler);

    server.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT} (no DB)`);
    });
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Shutting down...');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = { app, server };
