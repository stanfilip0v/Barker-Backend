const router = require('express').Router();
const Bark = require('../models/Bark');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Report = require('../models/Report');
const { validationResult, body } = require('express-validator/check');
const auth = require('../middleware/auth');

const validation = [
    body('content')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Input needs to have at least 1 character!')
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

function getBarksByFollowing(req, res, next) {
    const { userId } = req;
    const barksByFollowing = [];

    User.findById(userId).then((user) => {
        Bark.find()
            .populate('creator')
            .then((barks) => {
                for (const bark of barks) {
                    for (const following of user.following) {
                        following.toString() === bark.creator._id.toString() ? barksByFollowing.push(bark) : null;
                    }

                    userId === bark.creator._id.toString() ? barksByFollowing.push(bark) : null;
                }

                res.status(200)
                    .json({ message: 'Barks fetched!', barksByFollowing });
            }).catch((error) => {
                if (!error.statusCode) {
                    res.status(500)
                }

                next(error);
            });

    }).catch((error) => {
        if (!error.statusCode) {
            res.status(500)
        }

        next(error);
    });
}

function createBark(req, res, next) {
    if (validateInput(req, res)) {
        const { content } = req.body;
        const { userId } = req;

        Bark.create({
            content,
            creator: userId,
            comments: []
        }).then((bark) => {
            User.findById(userId).then((user) => {
                user.barks.push(bark._id);
                user.save();
            }).then(() => {
                res.status(201)
                    .json({ message: 'Bark created!', bark });
            }).catch((error) => {
                if (!error.statusCode) {
                    res.status(500)
                }

                next(error);
            });
        }).catch((error) => {
            if (!error.statusCode) {
                res.status(500)
            }

            next(error);
        });
    }
}

function deleteBark(req, res, next) {
    const { barkId } = req.params;
    const { userId, isAdmin } = req;

    Bark.findById(barkId).then((bark) => {
        if (!bark) {
            const error = new Error('Bark not found!');
            error.statusCode = 404;
            throw error;
        }

        if (bark.creator.toString() !== userId && isAdmin === false) {
            const error = new Error('Unauthorized');
            error.statusCode = 403;
            throw error;
        }

        return Bark.findByIdAndDelete(barkId);
    }).then(() => {
        return Comment.deleteMany({ bark: barkId });
    }).then(() => {
        return Report.deleteMany({ bark: barkId });
    }).then(() => {
        return User.findById(userId);
    }).then((user) => {
        user.barks.pull(barkId);
        return user.save();
    }).then(() => {
        res.status(200)
            .json({
                message: 'Bark deleted successfully!'
            });
    }).catch((error) => {
        if (!error.statusCode) {
            error.statusCode = 500;
        }

        next(error);
    });
}

function getBarkById(req, res, next) {
    const { barkId } = req.params;

    Bark.findById(barkId)
        .populate({
            path: 'comments',
            populate: {
                path: 'creator'
            }
        })
        .populate('creator')
        .then((bark) => {
            res.status(200)
                .json({
                    message: 'Bark fetched successfully!',
                    bark
                });
        }).catch((error) => {
            if (!error.statusCode) {
                error.statusCode = 500;
            }

            next(error);
        });
}

function likeBark(req, res, next) {
    const { barkId } = req.params;
    const { userId } = req;

    User.findById(userId).then((user) => {
        Bark.findById(barkId)
            .populate({
                path: 'comments',
                populate: {
                    path: 'creator'
                }
            })
            .populate('creator')
            .then((bark) => {
                const isLiked = user.likedBarks.some((b) => {
                    return b.equals(barkId);
                });
                let liked;

                if (isLiked) {
                    user.likedBarks.pull(barkId);
                    bark.likes -= 1;
                    liked = false;
                } else {
                    user.likedBarks.push(barkId);
                    bark.likes += 1;
                    liked = true;
                }

                user.save();
                bark.save();

                res.status(200)
                    .json({ isLiked: liked, bark })
            }).catch((error) => {
                if (!error.statusCode) {
                    error.statusCode = 500;
                }

                next(error);
            });
    }).catch((error) => {
        if (!error.statusCode) {
            error.statusCode = 500;
        }

        next(error);
    });

}

router
    .post('/create', validation, auth.isAuth, createBark)
    .get('/getBarksByFollowing', auth.isAuth, getBarksByFollowing)
    .post('/like/:barkId', auth.isAuth, likeBark)
    .get('/details/:barkId', auth.isAuth, getBarkById)
    .delete('/:barkId/delete', auth.isAuth, deleteBark)

module.exports = router;