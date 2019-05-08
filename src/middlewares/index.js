module.exports = {
  cacheMiddleware: require('./cacheCheck'),
  exceptionHandlerMiddleware: require('./appExceptionHandler'),
  maliciousDetectMiddleware: require('./maliciousReqValidation'),
};
