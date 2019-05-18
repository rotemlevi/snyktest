const Logger = require('../logger/log');

module.exports = (err, req, res, next) => {
    Logger.error(err);
    return res.sendStatus(500);
};