const Logger = require('../logger/log');

module.exports = async (err, req, res, next) => {
    Logger.error(err.object);
    return res.status(500).send(err.msg);

};