// firebase-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json'); // downloaded from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
