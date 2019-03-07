const environment = process.env.NODE_ENV || 'development';

const express = require('express');
const settings = require('./config/settings')[environment];

const app = express();

require('./database/database')(settings);
require('./config/express')(app);
require('./routes/index')(app);

app.use((error, req, res, next) => {
    const status = error.statusCode || 500;
    const message = error.message;
    res.status(status).json({ error: message });
    next();
});

app.listen(settings.port, () => {
    console.log(`Listening on ${settings.port}`);
});