process.env['NODE_ENV'] = 'development';
process.env['PORT'] = '4000';
process.env['DEBUG_PORT'] = '9229';
process.env['DS_API_HOST'] = 'http://eng-task.pxchk.net';
//process.env['REDIS_URI'] = '//redis:6379';
process.env['CACHE_TTL_IN_SECS'] = '3600';




const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const router = require('./src/router/routes');
const app = express();
const Logger= require('./src/logger/log');

//const helmet = require('helmet');
//const bodyParser = require('body-parser')
const {
    cacheMiddleware,
    exceptionHandlerMiddleware,
    maliciousDetectMiddleware
} = require('./src/middlewares');


const { PORT = 4000 } = process.env;

app.set("views", path.join(__dirname, "views"));
app.use(cookieParser());
// First check the cache to speed up request handling
app.use(cacheMiddleware);
// Cookie parser middleware
// Middleware that checks if request is malicious
app.use(maliciousDetectMiddleware);
//app.use(helmet());

app.use(router);

const server = app.listen(PORT, () => {
    console.log(`Express running → PORT ${ server.address().port }`);
});

module.exports = app;