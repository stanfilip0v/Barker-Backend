const mongoose = require('mongoose');

const barkSchema = mongoose.Schema({
    content: {
        type: mongoose.Schema.Types.String,
        required: [true, 'Content is required']
    },
    creationDate: {
        type: mongoose.Schema.Types.Date,
        default: new Date()
    },
    likes: {
        type: mongoose.Schema.Types.Number,
        default: 0
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }]
});

const Bark = mongoose.model('Bark', barkSchema);

module.exports = Bark;