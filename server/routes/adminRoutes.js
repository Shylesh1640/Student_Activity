const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  login,
  getStudents,
  getStudentLogs,
  getStudentAlerts,
  generateStudentReport,
  downloadReport,
  getAllAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  sendCommand,
  getStudentReports,
  changePassword,
  createStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/adminController');

// Public route
router.post('/login', login);

// Protected routes
router.post('/change-password', authenticateToken, changePassword); // Added changePassword route
router.post('/students', authenticateToken, createStudent); // Added createStudent route
router.get('/students', authenticateToken, getStudents);
router.get('/students/:id/logs', authenticateToken, getStudentLogs);
router.get('/students/:id/alerts', authenticateToken, getStudentAlerts);
router.get('/students/:id/reports', authenticateToken, getStudentReports);
router.patch('/students/:id', authenticateToken, updateStudent);
router.delete('/students/:id', authenticateToken, deleteStudent);
router.post('/students/:id/report', authenticateToken, generateStudentReport);
router.get('/reports/download/:reportId', authenticateToken, downloadReport);
router.get('/alerts', authenticateToken, getAllAlerts);
router.post('/alerts/:id/acknowledge', authenticateToken, acknowledgeAlert);
router.post('/alerts/acknowledge-all', authenticateToken, acknowledgeAllAlerts);
router.post('/command', authenticateToken, sendCommand);

module.exports = router;
