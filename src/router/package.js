const express = require('express');
const router = express.Router();
const { exceptionHandler, crawler } = require('../middlewares');

router.use(express.json());
router.use(express.urlencoded({
    extended: false
}));

// App routes
router.get('/:name/:version/:type', exceptionHandler, crawler);

module.exports = router;