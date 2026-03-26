const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A', 'B', 'AB', 'O', 'Unknown'],
    default: 'O'
  },
  contact: {
    type: String
  },
  history: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'analysis'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('patient', PatientSchema);
