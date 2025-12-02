import type { Request, Response, NextFunction } from 'express'

const VALID = /^[a-zA-Z_][a-zA-Z0-9_]*$/

declare global {
  namespace Express {
    interface Request {
      schema?: string
    }
  }
}

export async function tenantSchema(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { schema } = req.params
  if (!schema || !VALID.test(schema)) {
    return res.status(400).json({
      mensagem:
        "Schema inválido. Use apenas letras, números e '_' e inicie com letra ou '_' (ex.: loja_1)",
      recebido: schema ?? null,
    })
  }
  req.schema = schema
  next()
}

