import type { Request, Response, NextFunction } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { env } from '../../config/env'
import { AppError } from '../errors/AppError'

// Estender o tipo Request para incluir informações do usuário autenticado
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        login: string
        email: string
        permissions: string[]
      }
    }
  }
}

/**
 * Lista de rotas públicas que não precisam de autenticação
 */
const PUBLIC_ROUTES = [
  '/health',
  '/api/health',
  '/clientes/publico',
  '/api/clientes/publico',
  '/docs',
  '/api/docs',
]

/**
 * Verifica se uma rota é pública
 */
const isPublicRoute = (path: string): boolean => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return PUBLIC_ROUTES.some((publicRoute) => normalizedPath.startsWith(publicRoute))
}

/**
 * Middleware de autenticação
 * Valida o access token usando o mesmo JWT_SECRET da API de usuários
 * Nota: A api-clientes-v2 deve usar o mesmo JWT_SECRET da api-usuarios-v2
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Se for uma rota pública, permite o acesso sem autenticação
    if (isPublicRoute(req.path)) {
      return next()
    }

    const authHeader = req.headers.authorization

    if (!authHeader) {
      throw new AppError('Token de autenticação não fornecido', 401)
    }

    const [scheme, token] = authHeader.split(' ')

    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Formato de token inválido. Use: Bearer <token>', 401)
    }

    // Validar token usando o JWT_SECRET (deve ser o mesmo da api-usuarios-v2)
    try {
      const payload = jwt.verify(token, env.security.jwtSecret) as JwtPayload & {
        type?: string
        userId?: string
        login?: string
        email?: string
        permissions?: string[]
      }

      if (payload.type !== 'access') {
        throw new AppError('Token inválido: tipo incorreto', 401)
      }

      if (!payload.userId || !payload.login || !payload.email) {
        throw new AppError('Token inválido: payload incompleto', 401)
      }

      req.user = {
        userId: payload.userId,
        login: payload.login,
        email: payload.email,
        permissions: payload.permissions || [],
      }

      return next()
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token expirado', 401)
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AppError('Token inválido', 401)
      }
      throw error
    }
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message })
    }
    return res.status(401).json({ status: 'error', message: 'Erro de autenticação' })
  }
}

