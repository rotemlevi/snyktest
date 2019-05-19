const { generateGraphPackageKey, validateDep, getUrl } = require("../utils");

const Axios = require('axios-https-proxy-fix');
const _ = require('lodash');
const redisClient = require('../dal/redis');
const baseURL = 'http://registry.npmjs.org/';
const Service = Axios.create({
    baseURL: baseURL,
    timeout: 30000,
    headers: {
        'Host': 'registry.npmjs.org',
        'Connection': 'keep-alive',
        'Cache-Control': "no-cache",
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
        'Upgrade-Insecure-Requests': '1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.8,he;q=0.6,de;q=0.4'
    }
    /*,proxy: {
        host: 'localhost',
        port: 8888
    }*/
});

let globalCache = {};

const getDependencies = async (package) => {
    let dep = {};
    let url = getUrl(package);
    try {
        let { data: { dependencies, devDependencies } } = await Service.get(url);
        dep = _.merge(dependencies, {});
    } catch (e) {
        Logger.error(`failed fatching package name: ${package.name}, version: ${package.version}`);
        Logger.error(`failed fatching url: ${baseURL}${url}`);
        Logger.error(e.message);
    }
    return dep;
}

module.exports = {
    getDependencies: async (package) => {
        let dep = {};
        const cacheKey = generateGraphPackageKey(package);
        if (globalCache[cacheKey]) return globalCache[cacheKey];
        let cachedVersion = await redisClient.getAsync(cacheKey);
        try {
            dep = JSON.parse(cachedVersion);
            if (!validateDep(cachedVersion)) throw "invalid cache version";
        } catch (e) {
            dep = await getDependencies(package);  
        }
        globalCache[cacheKey] = dep;
        redisClient.setexAsync(cacheKey, JSON.stringify(dep));
        return dep;
    }
}