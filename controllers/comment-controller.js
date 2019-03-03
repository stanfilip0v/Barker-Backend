const router = require('express').Router();
const Bark = require('../models/Bark');
const Comment = require('../models/Comment');
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

function createComment(req, res, next) {
    if (validateInput(req, res)) {
        const { barkId } = req.params;
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

function deleteComment(req, res, next) {
    const { commentId } = req.params;
    const { userId, isAdmin } = req;

    Comment.findById(commentId)
        .populate('bark')
        .then((comment) => {
            if (!comment) {
                const error = new Error('Comment not found!');
                error.statusCode = 404;
                throw error;
            }

            if (comment.creator.toString() !== userId && isAdmin === false) {
                const error = new Error('Unauthorized');
                error.statusCode = 403;
                throw error;
            }
            
            return Comment.findByIdAndDelete(commentId).populate('bark');
        }).then((comment) => {
            comment.bark.comments.pull(comment._id);
            return comment.bark.save();
        }).then(() => {
            res.status(200)
            .json({
                message: 'Comment deleted successfully!'
            });
        }).catch((error) => {
            if (!error.statusCode) {
                error.statusCode = 500;
            }
    
            next(error);
        });
}

router
    .post('/create/:barkId', validation, auth.isAuth, createComment)
    .delete('/delete/:commentId', auth.isAuth, deleteComment);

module.exports = router;