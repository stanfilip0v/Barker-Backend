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
    const { userId } = req.params;

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

function followUser(req, res, next) {
    const { userId } = req;
    const { userId: userToFollowId } = req.params;

    if (userId === userToFollowId) {
        return res.status(400)
            .json({ error: `You can't follow yourself` });
    }

    User.findById(userId).then((user) => {
        User.findById(userToFollowId)
            .populate('barks')
            .then((userToFollow) => {
                let isFollowing = user.following.some(function (followingUser) {
                    return followingUser.equals(userToFollowId);
                });
                let isFollower = userToFollow.followers.some(function (followersUser) {
                    return followersUser.equals(userId);
                });

                if (isFollower && isFollowing) {
                    user.following.pull(userToFollowId);
                    userToFollow.followers.pull(userId);
                    user.save();
                    userToFollow.save();
                } else if (!isFollower && !isFollowing) {
                    user.following.push(userToFollowId);
                    userToFollow.followers.push(userId);
                    user.save();
                    userToFollow.save();
                }

                userToFollow = userToFollow.toObject();
                delete userToFollow.hashedPass;
                delete userToFollow.salt;

                res.status(200)
                    .json(userToFollow);
            }).catch((error) => {
                if (!error.statusCode) {
                    error.statusCode = 500
                }

                next(error);
            });
    }).catch((error) => {
        if (!error.statusCode) {
            error.statusCode = 500
        }

        next(error);
    });
}

function getSuggested(req, res, next) {
    const { userId } = req;
    const suggestedUsers = [];

    Array.prototype.diff = function (a) {
        return this.filter(function (i) { return a.indexOf(i) < 0; });
    };

    User.findById(userId)
        .populate('following')
        .then((user) => {
            User.find().then((users) => {
                users.splice(users.findIndex((u) => u._id.toString() === userId), 1);
                if (user.following.length === 0) {
                    return res.status(200)
                        .json(users);
                }

                const followingToString = [];
                for (const followedUser of user.following) {
                    followingToString.push(followedUser._id.toString());
                }


                for (const followedUser of user.following) {
                    for (const nestedFollowedUser of followedUser.following) {
                        if (!followingToString.includes(nestedFollowedUser._id.toString()) && nestedFollowedUser._id.toString() !== userId) {
                            followingToString.push(nestedFollowedUser._id.toString());

                            const suggestedUser = users.find((u) => u._id.toString() === nestedFollowedUser._id.toString()).toObject();
                            suggestedUser.followedBy = followedUser.username;
                            delete suggestedUser.salt;
                            delete suggestedUser.hashedPass;
                            suggestedUsers.push(suggestedUser);
                        }
                    }
                }

                if (suggestedUsers.length > 0) {
                    res.status(200)
                        .json(suggestedUsers);
                } else {
                    const usersToString = [];
                    for (const user of users) {
                        usersToString.push(user._id.toString());
                    }

                    const usersLeftToString = usersToString.diff(followingToString);
                    const usersLeft = [];
                    for (let userId of usersLeftToString) {
                        let user = users.find((u) => u._id.toString() === userId).toObject();
                        delete user.salt;
                        delete user.hashedPass;
                        usersLeft.push(user);
                    }

                    res.status(200)
                        .json(usersLeft);
                }

            }).catch((error) => {
                if (!error.statusCode) {
                    error.statusCode = 500
                }

                next(error);
            });
        }).catch((error) => {
            if (!error.statusCode) {
                error.statusCode = 500
            }

            next(error);
        });
}

function getFollowing(req, res, next) {
    const { username } = req.params;

    User.findOne({ username })
        .populate('following')
        .then((user) => {
            const followingUsers = user.following;
            return res.status(200)
                .json(followingUsers);
        }).catch((error) => {
            if (!error.statusCode) {
                error.statusCode = 500
            }

            next(error);
        });
}

function getFollowers(req, res, next) {
    const { username } = req.params;

    User.findOne({ username })
        .populate('followers')
        .then((user) => {
            const followers = user.followers;
            return res.status(200)
                .json(followers);
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
    .get('/suggested', auth.isAuth, getSuggested)
    .get('/following/:username', auth.isAuth, getFollowing)
    .get('/followers/:username', auth.isAuth, getFollowers)
    .post('/follow/:userId', auth.isAuth, followUser)
    .get('/profile/:userId', auth.isAuth, getUserById);

module.exports = router;