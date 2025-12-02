import { Pool } from 'pg'
import { env } from '../../config/env'

export const pool = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on('error', (error) => {
  console.error('[DB] Unexpected error on idle client', error)
})

