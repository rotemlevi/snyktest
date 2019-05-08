const express = require('express');
const router = express.Router();
const Logger = require('../logger/log');
 
// App routes
router.get('/', (req, res) => res.redirect('/index.html'));
router.get('/index.html', (req, res) => {
    Logger.info(`Request is valid, for ip: ${req.ip}, user-agent: ${req.get('user-agent')}`);
    return res.render("index");
});
  
module.exports = router;


