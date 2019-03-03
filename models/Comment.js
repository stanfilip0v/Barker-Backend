const mongoose = require('mongoose');

const commentSchema = mongoose.Schema({
    content: {
        type: mongoose.Schema.Types.String,
        required: [true, 'Content is required']
    },
    creationDate: {
        type: mongoose.Schema.Types.Date,
        default: new Date()
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    bark: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Bark'
    },
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;