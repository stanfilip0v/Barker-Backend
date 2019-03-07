const router = require('express').Router();
const User = require('../models/User');
const encryption = require('../config/encryption');
const jwt = require('jsonwebtoken');
const { validationResult, body } = require('express-validator/check');
const auth = require('../middleware/auth');

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

function signUp(req, res, next) {
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
            likedBarks: [],
            roles: ['User'],
            picture: '/user-picture.png'
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

function signIn(req, res, next) {
    const { email, password } = req.body;
    User.findOne({ email })
        .populate('barks')
        .populate('following')
        .populate('followers')
        .then((user) => {
            if (!user) {
                const error = new Error('A user with this email could not be found');
                error.statusCode = 401;
                throw error;
            }

            if (!user.authenticate(password)) {
                const error = new Error('Invalid password!');
                error.statusCode = 401;
                throw error;
            }

            const token = jwt.sign({
                email: user.email,
                userId: user._id.toString(),
                isAdmin: user.roles.includes('Admin')
            },
                encryption.jwtSecret,
                { expiresIn: '1h' });

            res.status(200)
                .json({
                    message: 'Login successful',
                    token,
                    userId: user._id.toString(),
                    username: user.username,
                    isAdmin: user.roles.includes('Admin')
                });
        }).catch((error) => {
            if (!error.statusCode) {
                error.statusCode = 500
            }

            next(error);
        });
}

function getUserById(req, res, next) {
    const { userId } = req;

    User.findById(userId)
        .populate('barks')
        .then((user) => {
            user = user.toObject();
            delete user.hashedPass;
            delete user.salt;
            
            res.status(200)
                .json(user);
        }).catch((error) => {
            if (!error.statusCode) {
                error.statusCode = 500
            }

            next(error);
        });
}

router
    .post('/signup', validation, signUp)
    .post('/signin', signIn)
    .get('/:userId', auth.isAuth, getUserById);

module.exports = router;