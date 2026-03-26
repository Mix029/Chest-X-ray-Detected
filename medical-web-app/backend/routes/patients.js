const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const logAction = require('../middleware/auditLogger');

// @route   GET api/patients
router.get('/', auth(['assistant', 'doctor', 'admin']), async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   POST api/patients
router.post('/', auth(['assistant', 'admin']), async (req, res) => {
  const { patientId, firstName, lastName, age, gender, contact, bloodGroup } = req.body;

  try {
    let patient = await Patient.findOne({ patientId });
    if (patient) {
      return res.status(400).json({ msg: 'Patient already exists' });
    }

    patient = new Patient({
      patientId,
      firstName,
      lastName,
      age,
      gender,
      bloodGroup,
      contact,
      createdBy: req.user.id
    });

    await patient.save();
    await logAction('Patient Registration', req.user.name, req.ip, `Registered patient ID: ${patientId}`);
    res.json(patient);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   PUT api/patients/:id
router.put('/:id', auth(['assistant', 'admin']), async (req, res) => {
  const { firstName, lastName, age, gender, contact, bloodGroup } = req.body;

  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ msg: 'Patient not found' });

    patient.firstName = firstName || patient.firstName;
    patient.lastName = lastName || patient.lastName;
    patient.age = age || patient.age;
    patient.gender = gender || patient.gender;
    patient.contact = contact || patient.contact;
    patient.bloodGroup = bloodGroup || patient.bloodGroup;

    await patient.save();
    await logAction('Patient Updated', req.user.name, req.ip, `Updated patient record: ${patient.patientId}`);
    res.json(patient);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   GET api/patients/:id
router.get('/:id', auth(['assistant', 'doctor', 'admin']), async (req, res) => {
  try {
    let populateOptions = {
      path: 'history',
      options: { sort: { timestamp: -1 } }
    };

    if (req.user.role === 'doctor') {
      populateOptions.match = { doctorId: req.user.id };
    }

    const patient = await Patient.findById(req.params.id).populate(populateOptions);
    if (!patient) return res.status(404).json({ msg: 'Patient not found' });
    
    res.json(patient);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/patients/:id
router.delete('/:id', auth(['assistant', 'admin']), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ msg: 'Patient not found' });

    if (req.user.role !== 'admin' && patient.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const patientId = patient.patientId;
    await Patient.findByIdAndDelete(req.params.id);
    await logAction('Patient Deleted', req.user.name, req.ip, `Deleted patient record: ${patientId}`);
    res.json({ msg: 'Patient deleted successfully' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   GET api/patients/hn/:patientId
// @desc    Get patient by Patient ID string (HN)
router.get('/hn/:patientId', auth(['assistant', 'doctor', 'admin']), async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.patientId });
    if (!patient) return res.status(404).json({ msg: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
