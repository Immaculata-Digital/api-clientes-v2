import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../errors/AppError'

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      details: err.details,
    })
  }

  console.error('[UnhandledError]', err)

  return res.status(500).json({
    status: 'error',
    message: 'Erro interno do servidor',
  })
}

