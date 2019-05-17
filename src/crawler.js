const Axios = require('axios');
const axios = Axios.create({
    baseURL: 'https://registry.npmjs.org/',
    timeout: 10000,
});
const fs = require('fs');
const _ = require('lodash');
const Path = require('path');
const util = require('util');

const normalizeVersion = (version) => {
    let exp = version.charAt(0) === '~' || version.charAt(0) === '^';
    version = exp ? version.slice(1, version.length) : version;
    version = version.replace("*", "latest");
    if (version.length == 1) return `${version}.0.0`;
    return version;
}
const getUrl = (packageName, packageVersion) => `${packageName}/${normalizeVersion(packageVersion)}`;
const xmlbuilder = require('xmlbuilder');

let queue = [];
let cache = {};

const getData = async (package) => {
    let dep = {};
    let url = getUrl(package.name, package.version);
    try {
        var {
            data: {
                dependencies,
                devDependencies
            }
        } = await axios.get(url);
        dep = _.merge(dependencies, {}); //devDependencies
    } catch (e) {
        console.log(`${url}, failed fatching package name: ${package.name}, version: ${package.version}`);
    }
    return dep;
}

module.exports = async (package) => {
    let fileName = Path.join(process.cwd(), "temp", `${Date.now()}.xml`);
    let writeStream = fs.createWriteStream(fileName, {
        flags: 'w',
        encoding: 'utf-8'
    });
    let writer = xmlbuilder.streamWriter(writeStream, {
        pretty: true,
        //width: 20
    });

    const Done = () => new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve("finished"));
        writeStream.on('error', (err) => reject(err));
    });
    
    let root = xmlbuilder.create('root'); // build the XML document
    let circuler = {};
    let dep = await getData(package);
    _.each(dep, (value, key) => {
        var node = {
            name: key,
            version: normalizeVersion(value),
            url: getUrl(key, value),
            dep: getData({
                name: key,
                version: value
            }),
            parent: root,
            height: 0
        };
        queue.push(node);
    });
    while (queue.length > 0) {
        var package = queue.pop();
        let cachedVersion = cache[package.name];
        var parent = package.parent;
        var child = parent.ele('package', {
            'name': package.name,
            'version': package.version
        });
        if (circuler[package.name]) continue;
        dep = cachedVersion || await package.dep;
        cache[package.name] = dep;
        circuler[package.name] = true;
        _.each(dep, (value, key) => {
            queue.push({
                name: key,
                version: value,
                url: getUrl(key, value),
                dep: getData({
                    name: key,
                    version: value
                }),
                parent: child,
                height: package.height++
            });
        });
    }
    var done = Done();
    root.end(writer); // call end to pass the XML document to the stream writer
    writeStream.end();
    await done;
    return fileName;
};