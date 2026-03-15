const mongoose = require('mongoose');

async function connectDB() {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/yomachat';
    
    // Bypass connection if we know it fails and we want to run offline
    if (uri.includes('mongodb.net')) {
        console.warn('⚠️ Atlas connection detected. Bypassing to avoid DNS crash.');
        return false;
    }

    try {
        await mongoose.connect(uri);
        console.log('✅ MongoDB connected successfully');
        return true;
    } catch (err) {
        console.warn('⚠️ MongoDB connection failed. Running in offline/mock mode.');
        console.error('❌ MongoDB connection error:', err.message);
        return false;
    }
}

module.exports = connectDB;
