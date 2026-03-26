const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// เชื่อมต่อภาพจาก Inference Server เพื่อแสดงผลหน้า Result
app.use('/outputs', express.static(path.join(__dirname, '..', '..', 'medical-ai-inference', 'outputs')));

// DB Connection (Placeholder - user should have MongoDB running)
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/medical-db')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('DB Connection Error: ', err));

// Routes
app.get('/', (req, res) => {
  res.send('Medical Web API is running...');
});

// Import and use routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/audit', require('./routes/audit'));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
