const router = require('express').Router();
const User = require('../models/User');
const encryption = require('../config/encryption');
const { body } = require('express-validator/check');
const { validationResult } = require('express-validator/check');

const validation = [
    body('email')
        .isEmail()
        .withMessage('Please enter a valid Email!')
        .custom((value) => {
            return User.findOne({ email: value })
                    .then((user) => {
                        if (user) return Promise.reject('E-Mail address already exists!');
                    });
        }),
    body('password')
        .trim()
        .isLength({ min: 6 })
        .withMessage('Please enter a valid password!'),
    body('username')
        .trim()
        .not().isEmpty()
        .withMessage('Please enter a valid username!')
        .custom((value) => {
            return User.findOne({ username: value })
                    .then((user) => {
                        if (user) return Promise.reject('Username address already exists!');
                    });
        })
]

function validateInput(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(422).json({
            message: 'Validation failed, entered data is incorrect',
            errors: errors.array()
        });

        return false;
    }

    return true;
}

function signUp(req, res) {
    if (validateInput(req, res)) {
        const { email, username, password } = req.body;
        const salt = encryption.generateSalt();
        const hashedPass = encryption.generateHashedPassword(salt, password);
        User.create({
            email,
            username,
            hashedPass,
            salt,
            barks: [],
            followers: [],
            following: [],
            roles: ['User'],
            picture: ''
        }).then((user) => {
            res.status(201)
                .json({ message: 'User created!', userId: user._id })
        }).catch((error) => {
            if (!error.statusCode) {
                res.status(500)
            }

            next(error);
        });
    }
}

router
    .post('/signup', validation, signUp);

module.exports = router;