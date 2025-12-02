import { Router } from 'express'
import { clienteRoutes } from '../modules/clientes/routes/cliente.routes'
// import { pontosMovimentacaoRoutes } from '../modules/pontos-movimentacao/routes/pontosMovimentacao.routes'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-clientes-v2' })
})

router.use('/clientes', clienteRoutes)
// router.use('/clientes', pontosMovimentacaoRoutes)

export const routes = router

