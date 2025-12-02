import { Router } from 'express'
import { clienteController } from '../controllers/ClienteController'
import { tenantSchema } from '../../../core/middlewares/tenantSchema'

export const clienteRoutes = Router()

// Rota pública para registro de clientes (sem autenticação)
clienteRoutes.post('/publico/:schema', tenantSchema, clienteController.store)

// Rotas com autenticação
clienteRoutes.get('/:schema', tenantSchema, clienteController.index)
clienteRoutes.get('/:schema/:id', tenantSchema, clienteController.show)
clienteRoutes.post('/:schema', tenantSchema, clienteController.store)
clienteRoutes.put('/:schema/:id', tenantSchema, clienteController.update)
clienteRoutes.delete('/:schema/:id', tenantSchema, clienteController.destroy)

