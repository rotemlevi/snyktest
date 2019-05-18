 const crypto = require('crypto');
 const semver = require('semver')

 const normalizeVersion = (version) => {
     let cleanVersion = version.toLowerCase();
     try {
         cleanVersion = cleanVersion.replace("*", "latest");
         if (cleanVersion === "latest") return "latest";
         return semver.coerce(cleanVersion).raw;
     } catch (e) {
         return cleanVersion;
     }
 };

 const getUrl = (packageName, packageVersion) => `${normalizeName(packageName)}/${normalizeVersion(packageVersion)}`;
 const normalizeName = (name) => {
     var temp = name.split('/');
     if (temp.length > 0) return temp[0];
     return temp;
 };
 const generateGraphPackageKey = (package) => crypto.createHash('md5').update(`${package.name}:${package.version}`).digest('hex');

 module.exports = {
     normalizeVersion: normalizeVersion,
     getUrl: getUrl,
     normalizeName: normalizeName,
     delay: (time) => (result) => new Promise(resolve => setTimeout(() => resolve(result), time)),
     validateDep: (dep) => Array.isArray(dep),
     xmlWriterDone: (writeStream, cb) => new Promise((resolve, reject) => {
         writeStream.on('finish', () => resolve("finished"));
         writeStream.on('error', (err) => reject(err));
     }),
     getParentPackage: (parent, defaultPackage) => {
         let package = {
             name: defaultPackage.name,
             version: defaultPackage.version
         }
         try {
             package.name = parent.attributes.nodes.name.value;
             package.version = parent.attributes.nodes.version.value;
         } catch (e) {}
         return package;
     },
     generateGraphPackageKey: generateGraphPackageKey,
     generateGraphPackage: (package, parentPackage) => {
         let packageKey = generateGraphPackageKey(package);
         let parentPackageKey = generateGraphPackageKey(parentPackage)
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
     generatePackageTask: (package, parent, height) => {
         return {
             name: package.name,
             version: normalizeVersion(package.version),
             url: getUrl(package.name, package.version),
             parent: parent,
             height: height
         };
     }
 }