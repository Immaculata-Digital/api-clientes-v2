import { Router } from 'express'
import { clienteController } from '../controllers/ClienteController'
import { tenantSchema } from '../../../core/middlewares/tenantSchema'

export const clienteRoutes = Router()

// Rota pública para registro de clientes (sem autenticação)
clienteRoutes.post('/publico/:schema', tenantSchema, clienteController.store)

// Rotas com autenticação
// IMPORTANTE: Rotas mais específicas primeiro (usuario/:idUsuario, creditar-pontos, debitar-pontos e codigos-resgate antes de :id)
clienteRoutes.get('/:schema', tenantSchema, clienteController.index)
clienteRoutes.get('/:schema/usuario/:idUsuario', tenantSchema, clienteController.showByUsuario)
// Rotas para movimentação de pontos (devem vir antes de /:schema/:id para não conflitar)
clienteRoutes.post('/:schema/:id/creditar-pontos', tenantSchema, clienteController.creditarPontos)
clienteRoutes.post('/:schema/:id/debitar-pontos', tenantSchema, clienteController.debitarPontos)
// Rota para marcar código como utilizado (deve vir antes de /:schema/:id)
clienteRoutes.put('/:schema/:id/pontos/:codigoResgate', tenantSchema, clienteController.marcarCodigoComoUtilizado)
// Rota para buscar código de resgate por código (deve vir antes de /:schema/:id)
clienteRoutes.get('/:schema/codigos-resgate/:codigoResgate', tenantSchema, clienteController.buscarCodigoResgate)
// Rota para buscar código de resgate por cliente e item (deve vir antes de /:schema/:id)
clienteRoutes.get('/:schema/:id/codigos-resgate/item/:idItemRecompensa', tenantSchema, clienteController.buscarCodigoPorClienteItem)
clienteRoutes.get('/:schema/:id', tenantSchema, clienteController.show)
clienteRoutes.post('/:schema', tenantSchema, clienteController.store)
clienteRoutes.put('/:schema/:id', tenantSchema, clienteController.update)
clienteRoutes.delete('/:schema/:id', tenantSchema, clienteController.destroy)

