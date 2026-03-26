const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logAction = require('../middleware/auditLogger');

// Login Route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    let user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
        name: user.name
      }
    };

    // Log the successful login
    await logAction('User Login', user.username, req.ip, `Logged in with role: ${user.role}`);

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'yoursecretkey',
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, role: user.role, name: user.name });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Seed some initial users if not already present
router.post('/seed', async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const users = [
      { username: 'admin', password: hashedPassword, name: 'Admin User', role: 'admin' },
      { username: 'asst1', password: hashedPassword, name: 'Assistant A', role: 'assistant' },
      { username: 'doctor1', password: hashedPassword, name: 'Dr. John Doe', role: 'doctor' }
    ];

    for (const u of users) {
      const existing = await User.findOne({ username: u.username });
      if (!existing) {
        await new User(u).save();
      }
    }

    res.json({ msg: 'Seed users created successfully' });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
