const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Analysis = require('./models/Analysis');

dotenv.config();

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const migrate = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/medical-db');
    console.log('MongoDB Connected.');

    // ค้นหาข้อมูล Analysis ที่ยังมี path เป็น local (ไม่มี http)
    const records = await Analysis.find({
      originalImagePath: { $not: /^http/ }
    });

    console.log(`Found ${records.length} records to migrate.`);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const localPath = path.resolve(__dirname, record.originalImagePath);

      if (fs.existsSync(localPath)) {
        console.log(`[${i + 1}/${records.length}] Uploading: ${localPath}`);
        
        try {
          const uploadRes = await cloudinary.uploader.upload(localPath, {
            folder: 'medical_ai/migrated',
            public_id: `migrated_patient_${record.patientId}_${record._id}`
          });

          // อัปเดต URL ใน MongoDB
          record.originalImagePath = uploadRes.secure_url;
          await record.save();
          
          console.log(`Successfully migrated record ID: ${record._id}`);
        } catch (uploadErr) {
          console.error(`Failed to upload ${localPath}:`, uploadErr.message);
        }
      } else {
        console.warn(`File not found, skipping: ${localPath}`);
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration Error:', err);
    process.exit(1);
  }
};

migrate();
