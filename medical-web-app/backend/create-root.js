const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const createRootUser = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('MONGO_URI is not defined in .env');
      process.exit(1);
    }

    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    const username = 'root';
    const password = 'root1234'; // You should change this after first login
    const name = 'Root Admin';
    const role = 'admin';

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log(`User "${username}" already exists.`);
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = new User({
        username,
        password: hashedPassword,
        name,
        role
      });

      await newUser.save();
      console.log(`Root user "${username}" created successfully with role "${role}".`);
      console.log(`Username: ${username}`);
      console.log(`Password: ${password}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error creating root user:', err);
    process.exit(1);
  }
};

createRootUser();
