const NpmRegistery = require('./services/npm');
const Fs = require('fs');
const _ = require('lodash');
const Async = require("async");
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
        this.queue = Async.queue(this.Process.bind(this), this.concurrency);
        this.writer = Xmlbuilder.streamWriter(this.writeStream, { pretty: true });
        
        this.queue.empty = () => Logger.info('last task is pending');
        this.queue.saturated = () => Logger.info('queue limit reached');
        this.queue.started = () => Logger.info('crawler started');
        this.queue.drain = () => Logger.info("all tasks finished");

        this.drain = queueDrain(this.queue);

        if (this.type === "xml") {
            this.root = Xmlbuilder.create('root');
            this.writeStream = Fs.createWriteStream(this.fileName, { flags: 'w', encoding: 'utf-8' });
            this.writeStream.on('finish', () => Logger.info("xml file is ready"));
            this.writeStream.on('error', (err) => log.error(err));
            this.xmlFinished = xmlWriterDone(this.writeStream);
        }
    }

    async Process(pack, done) {
        let dep = await NpmRegistery.getDependencies(pack);
        let child = undefined;
        if (this.type === "xml") child = pack.parentNode.ele('package', pack);
        else if (this.type === "json") this.json.push(generateGraphPackage(pack, pack.parentPackage));    
        Logger.debug(`worker add package: ${pack.name}`);
        if (this.cache[pack.name]) return;
        this.cache[pack.name] = true;
        _.each(dep, async (version, name) => {
            let packageTask = generatePackageTask({name, version}, child, pack, pack.height++);
            this.queue.push(packageTask);
        });
        done();
    }

    async Fatch() {
        let packageTask = generatePackageTask(this.package, this.root, undefined, 0);
        this.queue.push(packageTask);
        await this.drain; //wait for all tasks to finish.
        if (this.root) this.root.end(this.writer); //write the tree to xml stream.
        if (this.writeStream) this.writeStream.end(); //end the xml stream.
        if (this.xmlFinished) await this.xmlFinished; //wait for the xml file to be complete.
        return this.type === "json" ? this.json : this.fileName; //if request type is json return the json file else return the xml file name.
    }
}

module.exports = async (package, config) => {
    config = config || { type: "xml" };
    let instance = new Crawller({
        package: package,
        type: config.type,
        concurrency: 15
    });
    return await instance.Fatch();
};