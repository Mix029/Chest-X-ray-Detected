const AuditLog = require('../models/AuditLog');

const logAction = async (action, user, ip = 'unknown', details = '') => {
  try {
    const newLog = new AuditLog({
      action,
      user,
      ip,
      details
    });
    await newLog.save();
  } catch (err) {
    console.error('Error logging action:', err.message);
  }
};

module.exports = logAction;
