const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const cloudinary = require('cloudinary').v2;
const Analysis = require('../models/Analysis');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const logAction = require('../middleware/auditLogger');

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/temp';
    if (!fs.existsSync(dir)){ fs.mkdirSync(dir, { recursive: true }); }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.post('/predict', auth(['doctor', 'assistant', 'admin']), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ msg: 'No image uploaded' });
  const { patientId } = req.body;
  const localFilePath = req.file.path;

  try {
    // 1. ส่งภาพไปให้ AI (FastAPI) วิเคราะห์
    const inferenceUrl = process.env.INFERENCE_SERVER_URL || 'http://localhost:8000';
    const form = new FormData();
    // ระบุ filename ให้ชัดเจนเพื่อให้ FastAPI สร้างไฟล์ในชื่อที่ตรงกัน
    form.append('file', fs.createReadStream(localFilePath), { filename: req.file.filename });

    const response = await axios.post(`${inferenceUrl}/predict`, form, {
      headers: form.getHeaders()
    });

    const { prediction, confidence } = response.data;
    
    // 2. อัปโหลดภาพต้นฉบับขึ้น Cloudinary
    const uploadOrig = await cloudinary.uploader.upload(localFilePath, {
      folder: 'medical_ai/originals',
      public_id: `orig_${patientId}_${Date.now()}`
    });

    // 3. ดึงภาพ Grad-CAM (กรอบแดง) จากโฟลเดอร์ outputs ของ AI
    // แก้ไข Path: ถอยหลัง 3 ชั้นเพื่อออกจาก backend/routes และเข้าสู่ medical-ai-inference
    const gradcamFilename = `gradcam_${req.file.filename}`;
    const gradcamLocalPath = path.resolve(__dirname, '..', '..', '..', 'medical-ai-inference', 'outputs', gradcamFilename);
    
    console.log(`[DEBUG] Looking for Grad-CAM at: ${gradcamLocalPath}`);

    let gradcamUrl = '';
    if (fs.existsSync(gradcamLocalPath)) {
      const uploadGC = await cloudinary.uploader.upload(gradcamLocalPath, {
        folder: 'medical_ai/gradcam',
        public_id: `gc_${patientId}_${Date.now()}`
      });
      gradcamUrl = uploadGC.secure_url;
      console.log(`[INFO] Grad-CAM uploaded: ${gradcamUrl}`);
    } else {
      console.warn(`[WARN] Grad-CAM file not found at: ${gradcamLocalPath}`);
    }

    const newAnalysis = new Analysis({
      patientId,
      doctorId: req.user.id,
      originalImagePath: uploadOrig.secure_url,
      gradcamImagePath: gradcamUrl || uploadOrig.secure_url, // Fallback เป็นภาพเดิมถ้าไม่เจอ GC
      prediction,
      confidence: Array.isArray(confidence[0]) ? Math.max(...confidence[0]) : confidence
    });

    await newAnalysis.save();
    await Patient.findOneAndUpdate({ patientId }, { $push: { history: newAnalysis._id } });

    // ลบไฟล์ชั่วคราว
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    // (ทางเลือก) ลบไฟล์ใน outputs ของ AI ด้วยก็ได้เพื่อประหยัดที่
    // if (fs.existsSync(gradcamLocalPath)) fs.unlinkSync(gradcamLocalPath);

    await logAction('Analysis Performed', req.user.name, req.ip, `Analyzed patient ID: ${patientId}. Result: ${prediction}`);
    
    res.json(newAnalysis);
  } catch (err) {
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    console.error('Analysis Error:', err.message);
    res.status(500).send('Server error during analysis');
  }
});

// ... ส่วนที่เหลือ (history, delete, stats) ...
router.get('/history', auth(['doctor', 'assistant', 'admin']), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'doctor') { query.doctorId = req.user.id; }
    const history = await Analysis.find(query).sort({ timestamp: -1 });
    res.json(history);
  } catch (err) { res.status(500).send('Server error'); }
});

router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);
    if (!analysis) return res.status(404).json({ msg: 'Record not found' });
    await Patient.findOneAndUpdate({ patientId: analysis.patientId }, { $pull: { history: req.params.id } });
    await Analysis.findByIdAndDelete(req.params.id);
    await logAction('Analysis Deleted', req.user.name, req.ip, `Deleted record: ${analysis._id}`);
    res.json({ msg: 'Deleted' });
  } catch (err) { res.status(500).send('Server error'); }
});

router.get('/stats', auth(['doctor', 'assistant', 'admin']), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'doctor') { query.doctorId = new require('mongoose').Types.ObjectId(req.user.id); }
    const totalCount = await Analysis.countDocuments(query);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayCount = await Analysis.countDocuments({ ...query, timestamp: { $gte: today } });
    const allAnalysis = await Analysis.find(query).select('confidence');
    let accuracy = allAnalysis.length > 0 ? (allAnalysis.reduce((acc, item) => acc + item.confidence, 0) / allAnalysis.length) * 100 : 0;
    const distribution = await Analysis.aggregate([{ $match: query }, { $group: { _id: "$prediction", value: { $sum: 1 }, avgConfidence: { $avg: "$confidence" } } }, { $project: { name: "$_id", value: 1, avgConf: { $multiply: ["$avgConfidence", 100] }, _id: 0 } }]);
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0)); const end = new Date(d.setHours(23, 59, 59, 999));
      const count = await Analysis.countDocuments({ ...query, timestamp: { $gte: start, $lte: end } });
      trendData.push({ name: d.toLocaleDateString('en-US', { weekday: 'short' }), count });
    }
    res.json({ totalCount, todayCount, accuracy: accuracy.toFixed(1), trendData, distribution });
  } catch (err) { res.status(500).send('Server error'); }
});

module.exports = router;
