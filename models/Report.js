const mongoose = require('mongoose');

const reportSchema = mongoose.Schema({
    content: {
        type: mongoose.Schema.Types.String,
        required: [true, 'Content is required']
    },
    bark: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Bark'
    },
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;