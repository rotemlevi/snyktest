const express = require('express');
const router = express.Router();
const Logger = require('../logger/log');

// App routes
router.get('/', (req, res) => res.redirect('/index.html'));
router.get('/index.html', async (req, res) => {
    try {
        return res.render("index");
    } catch (err) {
        Logger.error(err);
        res.status(500).send("failed to analyze package");
    }
});

module.exports = router;