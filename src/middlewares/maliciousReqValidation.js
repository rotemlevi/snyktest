const redisClient = require('../dal/redis');
const Logger = require('../logger/log');
const axios = require('axios');

module.exports = async (req, res, next) => {
    const { _enforce = null} = req.cookies; // extract the enforce cookie
    const { cacheKey = null, cacheValue = null } = req.cacheObject; // extract the cache key and value of the current request

    let validRequest = cacheValue;

    // No cache and we have a cookie
    if (!validRequest && _enforce) {
        try {
            // Parse cookie
            const decodeCookie = Buffer.from(req.cookies._enforce, 'base64').toString();
            const { validation } = JSON.parse(decodeCookie);
            validRequest = validation;
        } catch (err) {
            Logger.error(err);
        }

    }

    if (!validRequest) {
        // Fetch validation from service if there was nothing in cache or empty cookie
        try {
            const validateReq = {
                ip: req.ip,
                userAgent: req.get('user-agent')
            };
            const { data: { validation } } = await axios.post(`${process.env.DS_API_HOST}/api/v1/validate`, validateReq);
            validRequest = validation;
        } catch (err) {
            Logger.error(err);
            return next(err);
        }
    }

    // If cache is empty - fill the cache
    if (!cacheValue) {
        await redisClient.setexAsync(cacheKey, validRequest);
    }
 
    return next((validRequest === 'OK') ? null : 'BAD');
};