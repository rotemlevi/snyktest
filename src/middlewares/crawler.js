const NpmRegistery = require('../services/npm');
const _ = require('lodash');
const Async = require("async");
const Logger = require('../logger/log');
const Xmlbuilder = require('xmlbuilder');
const JsonBuilder = require('json-builder');

const {
    createPackageNode,
    createPackageTask,
    createGraphPackage,
    generateGraphPackageKey,
    writerEndAsync,
    queueDrainAsync
} = require("../utils");

const Crawller = class {
    constructor(config) {
        this.cache = {};
        this.package = config.package;
        this.type = config.type || "xml";
        this.concurrency = config.concurrency || 10;
        this.rootKey = generateGraphPackageKey(this.package);
        this.queue = Async.queue(this.Process.bind(this), this.concurrency);
        this.queue.empty = () => Logger.info('last task is pending');
        this.queue.saturated = () => Logger.info('queue limit reached');
        this.queue.started = () => Logger.info('crawler started');
        this.queue.drain = () => Logger.info("all tasks finished");
        this.drain = queueDrainAsync(this.queue);
        this.writeStream = config.response;
        if (this.type === "xml") {
            this.root = Xmlbuilder.create('root');
            this.writeStream.set('Content-Type', 'text/xml');
            this.xmlWriter = Xmlbuilder.streamWriter(this.writeStream, { pretty: true });
        } else if (this.type === "json") {
            this.writeStream.set('Content-Type', 'application/json');
            this.jsonWriter = JsonBuilder.stream(this.writeStream).list();
        }
        this.writeStream.on('error', (err) => log.error(err));
        this.writeStream.on('finish', () => Logger.info("response is ready"));
        this.responseEnd = writerEndAsync(this.writeStream);
    }

    async Process(packageTask, done) {
        Logger.debug(`worker processing package: ${packageTask.name}`);
        let dep = await NpmRegistery.getDependencies(packageTask);
        let packageNode = undefined;
        if (this.xmlWriter) packageNode = createPackageNode(packageTask);
        if (this.jsonWriter) this.jsonWriter.val(createGraphPackage(packageTask));
        if (this.cache[packageTask.name]) return; // we already got this package as a depndency
        this.cache[packageTask.name] = true;
        _.each(dep, async (version, name) => {
            let packageDepTask = createPackageTask({
                name,
                version
            }, packageNode, packageTask, packageTask.height++);
            this.queue.push(packageDepTask);
        });
        Logger.debug(`worker added package: ${packageTask.name}`);
        done();
    }

    async Fatch() {
        let packageTask = createPackageTask(this.package, this.root, undefined, 0);
        this.queue.push(packageTask);
        await this.drain; //wait for all tasks to finish.
        if (this.root) this.root.end(this.xmlWriter); //dump the tree to the output.
        if (this.jsonWriter) this.jsonWriter.close(); //close the jsonBuilder stream.
        this.writeStream.end(); //end the write stream.
        return await this.responseEnd; //wait for write to stream is done.
    }
}

module.exports = async (req, res, next) => {
    try {
        req.setTimeout(500000);
        await (new Crawller({
            package: {
                name: req.params.name.toLowerCase().trim(),
                version: req.params.version.toLowerCase().trim()
            },
            type: req.params.type.toLowerCase().trim(),
            concurrency: 15,
            response: res
        })).Fatch();
    } catch (err) {
        next({
            object: err,
            msg: "failed to analyze package"
        });
    }
};