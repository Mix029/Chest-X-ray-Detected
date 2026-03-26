const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalImagePath: { type: String, required: true },
  gradcamImagePath: { type: String },
  prediction: { type: String, required: true },
  confidence: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Analysis', AnalysisSchema);
