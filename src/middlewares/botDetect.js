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
            var parsedCookie = JSON.parse(req.cookies._enforce);
            const decodeValue = Buffer.from(parsedCookie.cookie, 'base64').toString();
            const { validation } = JSON.parse(decodeValue);
            validRequest = validation;
        } catch (err) {
            Logger.error(err);
        }

    }
    
    if (!validRequest) {
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

     if (!cacheValue) {
        await redisClient.setexAsync(cacheKey, validRequest || "BAD");
    }
 
    return next((validRequest === 'OK') ? null : 'BLOCKED');
};