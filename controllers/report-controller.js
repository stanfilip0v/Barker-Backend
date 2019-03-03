const router = require('express').Router();
const auth = require('../middleware/auth');
const Report = require('../models/Report');
const { validationResult, body } = require('express-validator/check');

const validation = [
    body('content')
        .trim()
        .isLength({ min: 10 })
        .withMessage('Please explain the issue with at least 10 characters.')
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

function createReport(req, res, next) {
    if (validateInput(req, res)) {
        const { barkId } = req.params;
        const { content } = req.body;

        Report.create({
            content,
            bark: barkId
        }).then((report) => {
            res.status(201)
                .json({ message: 'Report has been sent.', report });
        }).catch((error) => {
            if (!error.statusCode) {
                error.statusCode = 500;
            }

            next(error);
        });
    }
}

function getAllReports(req, res, next) {
    Report.find().then((reports) => {
        res.status(201)
            .json({ message: 'Reports fetched', reports });
    }).catch((error) => {
        if (!error.statusCode) {
            error.statusCode = 500;
        }

        next(error);
    });
}

function deleteReport(req, res, next) {
    
}

router
    .post('/create/:barkId', validation, auth.isAuth, createReport)
    .delete('/delete/:reportId', auth.isAuth, auth.isAdmin, deleteReport)
    .get('/getall', auth.isAuth, auth.isAdmin, getAllReports);

module.exports = router;