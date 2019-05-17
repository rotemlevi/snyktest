"use strict";

require("babel-polyfill");

const Promise = require('promise'),
    fs = require('fs');

var Stream = class {
    constructor(fileName) {
        this._stream = fs.createReadStream(fileName);
        this._data = "";
        this._stream.on('data', (chunk) => this._data += chunk);
        this._OnData = new Promise((resolve, reject) => {
            this._stream.on('end', () => resolve(this._data));
            this._stream.on('error', (err) => reject(err));
        });
    }

    getData() {
        return this._OnData;
    }
}

module.exports = {
    Stream: function (stream) {
        return new Stream(stream);
    },
}