const mongoose = require('mongoose');
const encryption = require('../config/encryption');

const userSchema = mongoose.Schema({
    email: {
        type: mongoose.Schema.Types.String,
        required: [true, 'Email is required'],
        unique: true
    },
    username: {
        type: mongoose.Schema.Types.String,
        required: [true, 'Username is required'],
        unique: true
    },
    salt: {
        type: mongoose.Schema.Types.String,
        required: true,
        unique: true
    },
    hashedPass: {
        type: mongoose.Schema.Types.String,
        required: true,
        unique: true
    },
    barks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bark'
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    picture: {
        type: mongoose.Schema.Types.String,
    },
    roles: [{
        type: mongoose.Schema.Types.String,
        default: 'User'
    }]
});
userSchema.method({
    authenticate: function (password) {
        return encryption.generateHashedPassword(this.salt, password) === this.hashedPass
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.seedAdmin = () => {
    User.find({}).then((users) => {
        if (users.length > 0) return

        let salt = encryption.generateSalt();
        let hashedPass = encryption.generateHashedPassword(salt, 'admin123');

        User.create({
            email: 'admin@mail.com',
            username: 'admin',
            followers: [],
            following: [],
            barks: [],
            hashedPass: hashedPass,
            salt: salt,
            roles: ['Admin'],
            picture: ''
        });

        console.log('Seed complete.');
    });
}