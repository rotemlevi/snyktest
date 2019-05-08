const Logger = require('../logger/log');

module.exports = (err, req, res, next) => {
    if (err === 'BLOCKED') {
        Logger.warn(`Request was blocked: ip:${req.ip}, user-agent:${req.get('user-agent')}`);
        return res.status(403).render("busted");
    } else {
        Logger.error(err);
        return res.sendStatus(500);
    }
};