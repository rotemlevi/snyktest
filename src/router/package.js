const express = require('express');
const router = express.Router();
const { exceptionHandler, crawler } = require('../middlewares');

router.use(express.json());
router.use(express.urlencoded({
    extended: false
}));

// App routes
router.get('/:name/:version/:type', crawler);

// Loogs errors and send message to client.
router.use(exceptionHandler);
module.exports = router;