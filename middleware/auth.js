const jwt = require('jsonwebtoken');
const encryption = require('../config/encryption');

module.exports.isAuth = (req, res, next) => {
    const authHeaders = req.get('Authorization');
    if (!authHeaders) {
        return res.status(401)
            .json({ message: 'Not authenticated.' })
    }

    const token = req.get('Authorization').split(' ')[1];
    let decodedToken;
    
    try {
        decodedToken = jwt.verify(token, encryption.jwtSecret);
    } catch(error) {
        return res.status(401)
            .json({ message: 'Token is invalid.', error });
    }

    if (!decodedToken) {
        return res.status(401)
            .json({ message: 'Not authorized.' });
    }

    req.userId = decodedToken.userId;
    req.isAdmin = decodedToken.isAdmin;
    next();
}

module.exports.isAdmin = (req, res, next) => {
    if(req.isAdmin === false) {
        return res.status(401)
            .json({ message: 'Not authorized.' });
    }

    next();
}