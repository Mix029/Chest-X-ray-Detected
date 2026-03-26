const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logAction = require('../middleware/auditLogger');

// @route   GET api/users
// @desc    Get all users (Admin only)
router.get('/', auth(['admin']), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/profile
// @desc    Update current user's profile (Self update)
router.put('/profile', auth(['admin', 'doctor', 'assistant']), async (req, res) => {
  const { name } = req.body;
  try {
    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const oldName = user.name;
    user.name = name || user.name;
    await user.save();

    await logAction('Profile Updated', user.username, req.ip, `Changed name from ${oldName} to ${user.name}`);
    
    res.json({ 
      name: user.name, 
      username: user.username, 
      role: user.role,
      token: req.header('x-auth-token') // ส่งกลับเพื่อความสะดวกในการอัปเดตหน้าบ้าน
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   POST api/users
// @desc    Create new user (Admin only)
router.post('/', auth(['admin']), async (req, res) => {
  const { username, password, name, role } = req.body;
  try {
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ username, password, name, role });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    await logAction('User Created', req.user.name, req.ip, `Created new user: ${username} (${role})`);
    res.json({ msg: 'User created successfully' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/:id
// @desc    Update user by ID (Admin only)
router.put('/:id', auth(['admin']), async (req, res) => {
  const { name, role, password } = req.body;
  try {
    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.name = name || user.name;
    user.role = role || user.role;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    await user.save();

    await logAction('User Account Managed', req.user.name, req.ip, `Modified user: ${user.username}`);
    res.json({ msg: 'User updated successfully' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/users/:id
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) return res.status(404).json({ msg: 'User not found' });
    if (userToDelete.username === 'root') return res.status(400).json({ msg: 'Cannot delete root user' });

    await User.findByIdAndDelete(req.params.id);
    await logAction('User Deleted', req.user.name, req.ip, `Deleted user: ${userToDelete.username}`);
    res.json({ msg: 'User deleted' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
