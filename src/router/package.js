const express = require('express');
const router = express.Router();
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { exceptionHandler } = require('../middlewares');
const crawler = require('../crawler');
const { deleteFileAsyc } = require("../utils");
router.use(express.json());
router.use(express.urlencoded({
    extended: false
}));
router.use(cookieParser());
router.use(exceptionHandler);

// App routes
router.get('/:name/:version/:type', async (req, res) => {
    req.setTimeout(500000);
    try {
        var package = {
            name: req.params.name.toLowerCase().trim(),
            version: req.params.version.toLowerCase().trim()
        };
        var response = await crawler(package, {
            type: req.params.type || "xml"
        });
        if (req.params.type === "xml") {
            let filename = response;
            let stream = fs.createReadStream(filename);
            stream.once("end", function () {
                stream.destroy(); 
                deleteFileAsyc(filename);
            }).pipe(res);
        } else res.status(200).json(response);
    } catch (err) {
        res.status(500).send("failed to analyze package");
    }
});

module.exports = router;