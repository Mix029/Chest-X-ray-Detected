const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');

// @route   GET api/audit
// @desc    Get all audit logs (Admin only)
router.get('/', auth(['admin']), async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
