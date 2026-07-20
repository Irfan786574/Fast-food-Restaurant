// models/userModel.js
const db = require('../config/dbConfig');
const bcrypt = require('bcryptjs');

// Function to create a new user in the database
const createUser = (name, email, password, callback) => {
  const hashedPassword = bcrypt.hashSync(password, 10); // Hash the password

  const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
  db.execute(query, [name, email, hashedPassword], (err, result) => {
    if (err) {
      console.error('Error creating user:', err);
      callback(err, null);
      return;
    }
    callback(null, result);
  });
};

// Function to find a user by email
const findUserByEmail = (email, callback) => {
  const query = `SELECT * FROM users WHERE email = ?`;
  db.execute(query, [email], (err, result) => {
    if (err) {
      console.error('Error fetching user by email:', err);
      callback(err, null);
      return;
    }
    callback(null, result[0]);
  });
};

module.exports = { createUser, findUserByEmail };
