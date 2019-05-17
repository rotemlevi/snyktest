process.env['PORT'] = process.env['PORT'] || '3000';
process.env['DEBUG_PORT'] = process.env['DEBUG_PORT'] || '9229';
process.env['CACHE_TTL_IN_SECS'] = process.env['CACHE_TTL_IN_SECS'] || '3600';

const express = require('express');
const app = express();
const packageRouter = require('./src/router/package');
const appRouter = require('./src/router/app');
const ejs = require('ejs');
const path = require('path');
const { PORT = 3000 } = process.env;

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set("views", path.join(__dirname, 'src', "views"));
app.use('/package', packageRouter)
app.use('/app', appRouter)
 
const server = app.listen(PORT, async() => {
   console.log(`Express running → PORT ${ server.address().port }`);
});

module.exports = app;