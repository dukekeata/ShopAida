const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const elapsed = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${elapsed}ms`
    );
  });

  next();
};

const errorLogger = (err, req, res, next) => {
  console.error(`
[${new Date().toISOString()}] ERROR ${req.method} ${req.originalUrl}
Status: ${err.status || 500}
Message: ${err.message}
Stack: ${err.stack || 'no stack trace'}
`);
  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};
