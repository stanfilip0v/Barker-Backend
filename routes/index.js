const controllers = require('../controllers/index');

module.exports = (app) => {
    app.use('/user', controllers.userController);
    app.use('/bark', controllers.barkController);
}