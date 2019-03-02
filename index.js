const environment = process.env.NODE_ENV || 'development';

const express = require('express');
const settings = require('./config/settings')[environment];

const app = express();

require('./database/database')(settings);
require('./config/express')(app);

app.listen(settings.port, () => {
    console.log(`Listening on ${settings.port}`);
});