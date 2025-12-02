import type { Request, Response } from 'express'

export const notFound = (req: Request, res: Response) => {
  return res.status(404).json({
    status: 'error',
    message: `Rota ${req.method} ${req.originalUrl} não encontrada`,
  })
}

