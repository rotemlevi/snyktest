const crypto = require('crypto');
const semver = require('semver')
const _ = require('lodash');
const fs = require('fs');
const util = require('util');

const normalizeVersion = (package) => {
    let cleanVersion = package.version; //.toLowerCase().replace("*", "latest");
    if (package.name.charAt(0) === '@') return "*";
    if (cleanVersion === "latest") return "latest";
    let semverObject = semver.coerce(cleanVersion);
    return semverObject ? semverObject.raw : cleanVersion;
};

const getUrl = (package) => `${normalizeName(package.name)}/${normalizeVersion(package)}`;
const normalizeName = (name) => encodeURIComponent(name);
const generateGraphPackageKey = (package) => crypto.createHash('md5').update(`${package.name}:${package.version}`).digest('hex');

module.exports = {
    normalizeVersion: normalizeVersion,
    getUrl: getUrl,
    normalizeName: normalizeName,
    generateGraphPackageKey: generateGraphPackageKey,
    deleteFileAsyc: (file) => util.promisify(fs.unlink).bind(fs)(file),
    delay: (time) => (result) => new Promise(resolve => setTimeout(() => resolve(result), time)),
    validateDep: (dep) => Array.isArray(dep),
    xmlWriterDone: (writeStream, cb) => new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve("finished"));
        writeStream.on('error', (err) => reject(err));
    }),
    generateGraphPackage: (package, parentPackage) => {
        let packageKey = generateGraphPackageKey(package);
        let parentPackageKey = !_.isEmpty(parentPackage) ?
            generateGraphPackageKey(parentPackage) : undefined;
        return {
            key: packageKey,
            name: package.name,
            source: "/static/package.png",
            parent: parentPackageKey,
            version: package.version
        }
    },
    queueDrain: (queue) => new Promise((resolve, reject) => {
        queue.drain = function () {
            resolve("finished");
        }
    }),
    generatePackageTask: (package, parentNode, parentPackage, height) => {
        return {
            name: package.name,
            version: normalizeVersion(package),
            url: getUrl(package),
            parentNode: parentNode,
            parentPackage: parentPackage,
            height: height
        };
    }
}