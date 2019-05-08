const express = require('express');
const router = express.Router();
const { DOMAIN = 'localhost', PORT = 4000 } = process.env;

// App routes
router.get('/', (req, res) => res.redirect('/index.html'));
router.get('/index.html', (req, res) => {
    console.log(`Request passed: ip: ${req.ip}, user-agent: ${req.get('user-agent')}`);
    return res.render("index");
});
  
module.exports = router;


