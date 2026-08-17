export function errorHandler(err, req, res, next) {
  console.error('[SERVER ERROR]:', err)

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500)

  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on the server.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  })
}

export default errorHandler
