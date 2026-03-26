const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  user: {
    type: String,
    required: true
  },
  ip: {
    type: String
  },
  details: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('audit_log', AuditLogSchema);
