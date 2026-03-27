const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalImagePath: { type: String, required: true },
  gradcamImagePath: { type: String },
  prediction: { type: String, required: true },
  actualResult: { type: String }, // Store ground truth for accuracy check
  confidence: { type: Number, required: true },
  allProbabilities: [{
    label: String,
    confidence: Number
  }],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Analysis', AnalysisSchema);
