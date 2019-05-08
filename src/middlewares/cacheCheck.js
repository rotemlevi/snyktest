const crypto = require('crypto');
const redisClient = require('../dal/redis');
const Logger = require('../logger/log');

module.exports = async (req, res, next) => {
    const ip = req.ip;
    const userAgent = req.get('user-agent');
    const cacheKey = crypto.createHash('md5').update(`${ip}:${userAgent}`).digest('hex');
    let cachedValue = null;
    
    try {
        cachedValue = await redisClient.getAsync(cacheKey);
    } catch (error) {
        Logger.error(err);
    }

    req.cacheObject = {
        cacheKey,
        cachedValue
    };
    next();
};