process.env['NODE_ENV'] = 'development';
process.env['PORT'] = '4000';
process.env['DEBUG_PORT'] = '9229';
process.env['DS_API_HOST'] = 'http://eng-task.pxchk.net';
process.env['CACHE_TTL_IN_SECS'] = '3600';
 
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const router = require('./src/router/routes');
const app = express();
const { PORT = 4000 } = process.env;
const ejs = require('ejs');
const { cache, exceptionHandler, botDetect } = require('./src/middlewares');
 
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set("views", path.join(__dirname, 'src', "views"));
app.use(cookieParser());
app.use(cache);
app.use(botDetect);
app.use(exceptionHandler);
app.use(router);

const server = app.listen(PORT, () => {
    console.log(`Express running → PORT ${ server.address().port }`);
});

module.exports = app;