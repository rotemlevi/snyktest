const npmRegistery = require('./services/npm');
const fs = require('fs');
const _ = require('lodash');
const Path = require('path');
const async = require("async");
const Logger = require('./logger/log');
const Xmlbuilder = require('xmlbuilder');
const {
    generatePackageTask,
    generateGraphPackage,
    generateGraphPackageKey,
    getParentPackage,
    xmlWriterDone,
    queueDrain
} = require("./utils");

const Crawller = class {
    constructor(config) {
        this.package = config.package;
        this.cache = {};
        this.type = config.type;
        this.rootKey = generateGraphPackageKey(this.package);
        this.concurrency = config.concurrency || 10;
        this.json = [];
        this.queue = async.queue(this.Process.bind(this), this.concurrency);
        this.fileName = Path.join(process.cwd(), "temp", `${Date.now()}.xml`);
        this.writeStream = fs.createWriteStream(this.fileName, {
            flags: 'w',
            encoding: 'utf-8'
        });
        this.writer = Xmlbuilder.streamWriter(this.writeStream, {
            pretty: true
        });
        this.root = Xmlbuilder.create('root');

        this.queue.empty = () => Logger.info('last task is pending');
        this.queue.saturated = () => Logger.info('queue limit reached');
        this.queue.started = () => Logger.info('crawler started');
        this.queue.drain = () => Logger.info("all tasks finished");

        this.writeStream.on('finish', () => Logger.info("xml file is ready"));
        this.writeStream.on('error', (err) => log.error(err));

        this.drain = queueDrain(this.queue);
        this.xmlFinished = xmlWriterDone(this.writeStream);
    }

    async Process(pack, done) {
        let dep = {};
        let parent = pack.parent;
        let child = parent.ele('package', {
            'name': pack.name,
            'version': pack.version
        });
        if (this.type === "json") {
            let graphParentPackage = getParentPackage(parent, this.package);
            let graphPackage = generateGraphPackage(pack, graphParentPackage);
            this.json.push(graphPackage);
        }
        dep = await npmRegistery.getDependencies(pack);
        Logger.debug(`worker add package: ${pack.name}`);
        if (this.cache[pack.name]) return;
        this.cache[pack.name] = true;
        _.each(dep, async (version, name) => {
            let packageTask = generatePackageTask({
                name,
                version
            }, child, pack.height++);
            this.queue.push(packageTask);
        });
        done();
    }

    async Fatch() {
        let packageTask = generatePackageTask(this.package, this.root, 0);
        this.queue.push(packageTask);
        await this.drain;
        this.root.end(this.writer);
        this.writeStream.end();
        await this.xmlFinished;
        return this.type === "json" ? this.json : this.fileName;
    }
}

module.exports = async (package, config) => {
    config = config || {
        type: "xml"
    };
    let instance = new Crawller({
        package: package,
        type: config.type,
        concurrency: 15
    });
    return await instance.Fatch();
};