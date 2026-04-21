const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  try {
    const dbName = config.databaseUrl.includes('quizbolt') ? 'quizbolt' : 'test';
    const conn = await mongoose.connect(config.databaseUrl, { dbName });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
