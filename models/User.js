const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    displayName: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 50
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
        required: true
    },
    country: {
        code: { type: String, required: true },
        name: { type: String, required: true },
        flag: { type: String, required: true }
    },
    interests: {
        type: [String],
        default: [],
        validate: {
            validator: function (v) {
                return v.length <= 10;
            },
            message: 'Maximum 10 interests allowed'
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Return safe user object (no password)
userSchema.methods.toPublicJSON = function () {
    return {
        id: this._id,
        email: this.email,
        displayName: this.displayName,
        gender: this.gender,
        country: this.country,
        interests: this.interests,
        createdAt: this.createdAt
    };
};

module.exports = mongoose.model('User', userSchema);
