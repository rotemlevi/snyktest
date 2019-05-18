const Axios = require('axios-https-proxy-fix');
const axios = Axios.create({
    baseURL: 'http://registry.npmjs.org/',
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
    },
    proxy: {
        host: 'localhost',
        port: 8888
    }

});
const fs = require('fs');
const _ = require('lodash');
const Path = require('path');
const async = require("async");
const Logger = require('./logger/log');
const redisClient = require('./dal/redis');
const crypto = require('crypto');

let globalCache = {};

const normalizeVersion = (version) => {
    let exp = version.charAt(0) === '~' || version.charAt(0) === '^';
    version = exp ? version.slice(1, version.length) : version;
    version = version.replace("*", "latest");
    version = version.replace(/x/gi, "1");
    if (version.length == 0) return `0.0.0`;
    if (version.length == 1) return `${version}.0.0`;
    if (version.length == 3) return `${version}.0`;
    return version;
}
const normalizeName = (name) => {
    var temp = name.split('/');
    if (temp.length > 0) return temp[0];
    return temp;
}
const getUrl = (packageName, packageVersion) => `${normalizeName(packageName)}/${normalizeVersion(packageVersion)}`;
const Xmlbuilder = require('xmlbuilder');
const delay = (time) => (result) => new Promise(resolve => setTimeout(() => resolve(result), time));
const validateDep = (dep) => Array.isArray(dep);
const getDep = async (package) => {
    const cacheKey = crypto.createHash('md5').update(`${package.name}:${package.version}`).digest('hex');
    if (globalCache[cacheKey]) return globalCache[cacheKey];
    let dep = {};
    let cachedVersion = await redisClient.getAsync(cacheKey);
    try {
        dep = JSON.parse(cachedVersion);
        if (!validateDep(cachedVersion)) throw "invalid cache version";
    } catch (e) {
        dep = await getData(package); //await package.dep
    }
    globalCache[cacheKey] = dep;
    redisClient.setexAsync(cacheKey, JSON.stringify(dep));
    return dep;
};
const getData = async (package) => {
    let dep = {};
    let url = getUrl(package.name, package.version);
    try {
        await delay(1000);
        var {
            data: {
                dependencies,
                devDependencies
            }
        } = await axios.get(url);
        dep = _.merge(dependencies, devDependencies);
    } catch (e) {
        Logger.error(`failed fatching package name: ${package.name}, version: ${package.version}`);
        Logger.error(`failed fatching url: https://registry.npmjs.org/${url}`);
        Logger.error(e.message);
    }
    return dep;
}

const Crawller = class {
    constructor(config) {
        this.package = config.package;
        this.cache = {};
        this.type = config.type;
        this.rootKey = crypto.createHash('md5').update(`${this.package.name}:${this.package.version}`).digest('hex');

        this.json = [{
            key: this.rootKey,
            source: "cat1.png",
            name: this.package.name,
            version: this.package.version
        }];

        this.queue = async.queue(async (pack, done) => {
            let parent = pack.parent;
            let child = parent.ele('package', {
                'name': pack.name,
                'version': pack.version
            });
            var parentJson = {
                name: "",
                version: ""
            }
            try {
                parentJson.name = parent.attributes.nodes.name.value;
                parentJson.version = parent.attributes.nodes.version.value;
            } catch (e) {

            }
            var nodeKey = crypto.createHash('md5').update(`${pack.name}:${pack.version}`).digest('hex');

            var jsonNode = {
                key: nodeKey,
                name: pack.name,
                source: "cat1.png",
                parent: this.rootKey,
                version: pack.version
            }
            if (parentJson.name) jsonNode.parent = crypto.createHash('md5').update(`${parentJson.name}:${parentJson.version}`).digest('hex');
            if (this.type === "json") this.json.push(jsonNode);
            let dep = await getDep(pack);
            console.log(`worker add package: ${pack.name}`);
            if (this.cache[pack.name]) return;
            this.cache[pack.name] = true;
            _.each(dep, async (value, key) => {
                this.queue.push({
                    name: key,
                    version: value,
                    url: getUrl(key, value),
                    parent: child,
                    height: pack.height++
                });
            });
            done();
        }, 10);
        this.fileName = Path.join(process.cwd(), "temp", `${Date.now()}.xml`);
        this.writeStream = fs.createWriteStream(this.fileName, {
            flags: 'w',
            encoding: 'utf-8'
        });
        this.writer = Xmlbuilder.streamWriter(this.writeStream, {
            pretty: true
        });
        this.root = Xmlbuilder.create('root');
        this.queue.empty = function () {
            //last task is pending
            console.log('Last Task');
        };
        this.queue.saturated = function () {
            //queue limit reached
            console.log('Saturated');
        };
        this.queue.started = function () {
            //started
            console.log('Started');
        };
    }

    async fatch() {
        const Drain = () => new Promise((resolve, reject) => {
            this.queue.drain = function () {
                resolve("finished");
            }
        });
        const Done = () => new Promise((resolve, reject) => {
            this.writeStream.on('finish', () => resolve("finished"));
            this.writeStream.on('error', (err) => reject(err));
        });
        let dep = await getData(this.package);
        _.each(dep, async (value, key) => {
            var node = {
                name: key,
                version: normalizeVersion(value),
                url: getUrl(key, value),
                parent: this.root,
                height: 0
            };
            this.queue.push(node);
        });
        var done = Done();
        var drain = Drain();
        await drain;
        this.root.end(this.writer); // call end to pass the XML document to the stream writer
        this.writeStream.end();
        await done;
        return this.type === "json" ? this.json : this.fileName;
    }
}

module.exports = async (package, config) => {
    config = config || {
        type: "xml"
    };
    let instance = new Crawller({
        package: package,
        type: config.type
    });
    return await instance.fatch();
};