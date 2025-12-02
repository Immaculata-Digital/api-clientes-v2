import type { NextFunction, Request, Response } from 'express'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = performance.now()

  res.on('finish', () => {
    const duration = (performance.now() - start).toFixed(2)
    const log = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    if (res.statusCode >= 400) {
      console.warn(log)
    } else {
      console.info(log)
    }
  })

  next()
}

