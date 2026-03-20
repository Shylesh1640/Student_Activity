const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.post('/student/login', studentController.loginStudent);
router.post('/student/logout', studentController.logoutStudent);

module.exports = router;
