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
        if (this.type === "xml") this.writeStream = fs.createWriteStream(this.fileName, {
            flags: 'w',
            encoding: 'utf-8'
        });
        this.writer = Xmlbuilder.streamWriter(this.writeStream, {
            pretty: true
        });

        if (this.type === "xml") {
            this.root = Xmlbuilder.create('root');
            this.writeStream.on('finish', () => Logger.info("xml file is ready"));
            this.writeStream.on('error', (err) => log.error(err));
            this.xmlFinished = xmlWriterDone(this.writeStream);
        }

        this.queue.empty = () => Logger.info('last task is pending');
        this.queue.saturated = () => Logger.info('queue limit reached');
        this.queue.started = () => Logger.info('crawler started');
        this.queue.drain = () => Logger.info("all tasks finished");


        this.drain = queueDrain(this.queue);
    }

    async Process(pack, done) {
        let dep = {};
        let child = undefined;
        if (this.type === "xml") {
            child = pack.parentNode.ele('package', {
                'name': pack.name,
                'version': pack.version
            });
        } else if (this.type === "json") {
            let graphPackage = generateGraphPackage(pack, pack.parentPackage);
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
            }, child, pack, pack.height++);
            this.queue.push(packageTask);
        });
        done();
    }

    async Fatch() {
        let packageTask = generatePackageTask(this.package, this.root, undefined, 0);
        this.queue.push(packageTask);
        await this.drain;
        if (this.root) this.root.end(this.writer);
        if (this.writeStream) this.writeStream.end();
        if (this.xmlFinished) await this.xmlFinished;
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