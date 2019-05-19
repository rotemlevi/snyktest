const NpmRegistery = require('../services/npm');
const _ = require('lodash');
const Async = require("async");
const Logger = require('../logger/log');
const Xmlbuilder = require('xmlbuilder');
const JsonBuilder = require('json-builder');

const {
    generatePackageTask,
    generateGraphPackage,
    generateGraphPackageKey,
    writerEndAsync,
    queueDrain
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
        this.drain = queueDrain(this.queue);
        this.writeStream = config.response;
        if (this.type === "xml") {
            this.root = Xmlbuilder.create('root');
            this.writeStream.set('Content-Type', 'text/xml');
            this.writer = Xmlbuilder.streamWriter(this.writeStream, {
                pretty: true
            });
        } else if (this.type === "json") {
            this.writeStream.set('Content-Type', 'application/json');
            this.writer = JsonBuilder.stream(this.writeStream);
            this.writer = this.writer.list();
        }
        this.writeStream.on('error', (err) => log.error(err));
        this.writeStream.on('finish', () => Logger.info("response is ready"));
        this.responseEnd = writerEndAsync(this.writeStream);
    }

    async Process(packageTask, done) {
        let dep = await NpmRegistery.getDependencies(packageTask);
        let packageNode = undefined;
        if (this.type === "xml") packageNode = packageTask.parentNode.ele('package', {
            name: packageTask.name,
            version: packageTask.version
        });
        else if (this.type === "json") this.writer.val(generateGraphPackage(packageTask, packageTask.parentPackage));
        Logger.debug(`worker add package: ${packageTask.name}`);
        if (this.cache[packageTask.name]) return; // we already got thie package as a depndency
        this.cache[packageTask.name] = true;
        _.each(dep, async (version, name) => {
            let packageDepTask = generatePackageTask({
                name,
                version
            }, packageNode, packageTask, packageTask.height++);
            this.queue.push(packageDepTask);
        });
        done();
    }

    async Fatch() {
        let packageTask = generatePackageTask(this.package, this.root, undefined, 0);
        this.queue.push(packageTask);
        await this.drain; //wait for all tasks to finish.
        if (this.type === "xml") {
            this.root.end(this.writer); //dump the tree to the output.
        } else if (this.type === "json") {
            this.writer.close(); //close the jsonBuilder stream.
        }
        this.writeStream.end(); //end the write stream.
        return await this.responseEnd;
    }
}

module.exports = async (req, res) => {
    req.setTimeout(500000);
    try {
        var package = {
            name: req.params.name.toLowerCase().trim(),
            version: req.params.version.toLowerCase().trim()
        };
        const crawler = new Crawller({
            package: package,
            type: req.params.type.toLowerCase().trim(),
            concurrency: 15,
            response: res
        });
        return crawler.Fatch();
    } catch (err) {
        Logger.error(err);
        res.status(500).send("failed to analyze package");
    }
};