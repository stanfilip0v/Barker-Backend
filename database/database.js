const mongoose = require('mongoose');
const User = require('../models/User');
mongoose.Promise = global.Promise;

module.exports = (settings) => {
    mongoose.connect(settings.connectionString, {
        useNewUrlParser: true,
        useCreateIndex: true
    });
    const database = mongoose.connection;

    database.once('open', (err) => {
        if (err) {
            throw err;
        }

        User.seedAdmin();
        console.log('Database ready.');
    });

    database.on('error', (err) => {
        console.log('Database error: ' + err);
    });
}