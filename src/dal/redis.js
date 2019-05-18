const redis = require('redis');
const { promisify } = require('util');
const { REDIS_URI = 'redis://localhost:6379', CACHE_TTL_IN_SECS = `${60*60*24*7}` } = process.env;
const client = redis.createClient(REDIS_URI);
const Logger = require('../logger/log');

client.on('error', err => {
    Logger.error(err);
});
 
module.exports = {
    ...client,
    getAsync: async(key) => {
        return await promisify(client.get).bind(client)(key);
    },
    setAsync: async(key, value) => {
        return await promisify(client.set).bind(client)(key, value);
    },
    setexAsync: async(key, value, ttl) => {
        return await promisify(client.setex).bind(client)(key, ttl || CACHE_TTL_IN_SECS, value);
    },
    removeAsync: async(key) => {
        return await promisify(client.del).bind(client)(key);
    },
};