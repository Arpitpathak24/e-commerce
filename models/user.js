const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: String,
  email: String,
  name: String,
  phone: String,
  address: String
});

module.exports = mongoose.model('User', userSchema);
