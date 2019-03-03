const router = require('express').Router();
const Bark = require('../models/Bark');
const User = require('../models/User');
const Comment = require('../models/Comment');
const ObjectId = require('mongodb').ObjectID;
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

function createBark(req, res, next) {
    if (validateInput(req, res)) {
        const { content } = req.body;
        const { userId } = req;

        Bark.create({
            content,
            creator: ObjectId(userId),
            comments: []
        }).then((bark) => {
            User.findById(userId).then((user) => {
                user.barks.push(bark._id);
                user.save();
            });

            res.status(201)
                .json({ message: 'Bark created!', bark });
        }).catch((error) => {
            if (!error.statusCode) {
                res.status(500)
            }

            next(error);
        });
    }
}

function deleteBark(req, res, next) {
    const { id: barkId } = req.params;
    const { userId } = req;

    Bark.findById(barkId).then((bark) => {
        if (!bark) {
            const error = new Error('Bark not found!');
            error.statusCode = 404;
            throw error;
        }

        if (bark.creator.toString() !== userId) {
            const error = new Error('Unauthorized');
            error.statusCode = 403;
            throw error;
        }

        return Bark.findByIdAndDelete(barkId);
    }).then((bark) => {
        for (const comment of bark.comments) {
            Comment.findByIdAndRemove(comment);
        }
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
    const { id: barkId } = req.params;

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

function createComment(req, res, next) {
    if (validateInput(req, res)) {
        const { id: barkId } = req.params;
        const { content } = req.body;
        const { userId } = req;

        Comment.create({
            content,
            creator: userId,
            bark: barkId
        }).then((comment) => {
            Bark.findById(barkId).then((bark) => {
                bark.comments.push(comment._id);
                bark.save();

                res.status(201)
                    .json({ message: 'Comment created successfully', comment });
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
}

router
    .post('/create', validation, auth.isAuth, createBark)
    .get('/:id', auth.isAuth, getBarkById)
    .post('/:id/comment', validation, auth.isAuth, createComment)
    .delete('/:id/delete', auth.isAuth, deleteBark)

module.exports = router;