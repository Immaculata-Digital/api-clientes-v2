import { env } from './config/env'
import { app } from './app'

const { port } = env.app

app.listen(port, () => {
  console.log(`🚀 API de clientes iniciada em http://localhost:${port}/api/health`)
})

