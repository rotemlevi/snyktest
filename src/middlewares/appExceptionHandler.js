const Logger = require('../logger/log');

module.exports = (err, req, res, next) => {
    // if (err === 'BAD') it means that we blocked the request - render error page
    if (err === 'BAD') {
        // Date for logging the blocked requests
        const dateNow = new Date();
        const datePretty = `${dateNow.getDate()}/${dateNow.getMonth() + 1}/${dateNow.getFullYear()}`;

        // Create a token that will be used if user want to complain that he is not bot
        // TODO need to come up with the shorter token
        const ip = req.ip;
        const userAgent = req.get('user-agent');
        const token = Buffer.from(JSON.stringify({ip, userAgent})).toString('base64');

        // Log data about blocked requests
        console.warn(`${datePretty} Request was blocked: ip:${req.ip}, user-agent:${req.get('user-agent')}`);
        Logger.warn(e);

        return res.status(403).render("error", { token });
    } else { // if there are problems with the service send Internal Service Exception
        console.error(err.message);
        return res.sendStatus(500);
    }
};
