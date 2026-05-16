const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  targetModel: { type: String, required: false },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: false },
  details: { type: mongoose.Schema.Types.Mixed, required: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
