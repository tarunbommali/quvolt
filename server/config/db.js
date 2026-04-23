const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
    try {
        const isProd = process.env.NODE_ENV === 'production';
        const conn = await mongoose.connect(config.mongoUri, {
            maxPoolSize: isProd ? 50 : 10,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
            heartbeatFrequencyMS: 10000,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
