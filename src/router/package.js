const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser');
const {
    exceptionHandler
} = require('../middlewares');
const crawler = require('../crawler');
router.use(express.json());
router.use(express.urlencoded({
    extended: false
}));
router.use(cookieParser());
router.use(exceptionHandler);

// App routes
router.get('/:name/:version', async (req, res) => {
    try {
        var package = {
            name: req.params.name,
            version: req.params.version
        };
        var fileName = await crawler(package);
        return res.status(200).sendFile(fileName);
    } catch (err) {
        return res.status(500).send("failed to analyze package");
    }
});

module.exports = router;