const mongoose = require('mongoose');
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

        console.log('Database ready.');
    });

    database.on('error', (err) => {
        console.log('Database error: ' + err);
    });
}