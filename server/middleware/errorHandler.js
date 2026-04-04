/**
 * Global error handler middleware.
 * Must be registered last in Express (4 arguments).
 */

export const errorHandler = (err, req, res, _next) => {
  console.error('[server error]', err);

  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ error: message, code: err.code || 'SERVER_ERROR' });
};
