const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongoUri, {
            serverSelectionTimeoutMS: process.env.NODE_ENV === 'development' ? 5000 : 30000,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
