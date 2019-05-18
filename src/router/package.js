const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser');
const { exceptionHandler } = require('../middlewares');
const crawler = require('../crawler');
router.use(express.json());
router.use(express.urlencoded({ extended: false }));
router.use(cookieParser());
router.use(exceptionHandler);

// App routes
router.get('/:name/:version/:type', async (req, res) => {
    req.setTimeout(500000);
    try {
        var package = {
            name: req.params.name,
            version: req.params.version

        };
        var response = await crawler(package,{
            type: req.params.type || "xml"
        });
        if(req.params.type === "xml") res.status(200).sendFile(response);
        else res.status(200).json(response);
        
       
        //fs.unlink(fileName);
    } catch (err) {
        res.status(500).send("failed to analyze package");
    }
});

module.exports = router;