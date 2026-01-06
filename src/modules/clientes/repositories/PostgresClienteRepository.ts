import { pool } from '../../../infra/database/pool'
import type { ClienteProps, CreateClienteProps, UpdateClienteProps } from '../entities/Cliente'
import { Cliente as ClienteEntity } from '../entities/Cliente'
import type { IClienteRepository } from './IClienteRepository'

type ClienteRow = {
  id_cliente: number
  id_usuario: number
  id_loja: number
  nome_completo: string
  email: string
  whatsapp: string
  cep: string
  sexo: 'M' | 'F'
  saldo: number
  aceite_termos: boolean
  dt_cadastro: Date
  usu_cadastro: number
  dt_altera: Date | null
  usu_altera: number | null
}

const mapRowToProps = (row: ClienteRow): ClienteProps => ({
  id_cliente: row.id_cliente,
  id_usuario: row.id_usuario,
  id_loja: row.id_loja,
  nome_completo: row.nome_completo,
  email: row.email,
  whatsapp: row.whatsapp,
  cep: row.cep,
  sexo: row.sexo,
  saldo: row.saldo,
  aceite_termos: row.aceite_termos,
  dt_cadastro: row.dt_cadastro,
  usu_cadastro: row.usu_cadastro,
  dt_altera: row.dt_altera,
  usu_altera: row.usu_altera,
})

export class PostgresClienteRepository implements IClienteRepository {
  async findAll(schema: string, filters: { limit: number; offset: number; search?: string; idLoja?: number }): Promise<{ rows: ClienteProps[]; count: number }> {
    const client = await pool.connect()
    try {
      let countQuery = `SELECT COUNT(*) as count FROM "${schema}".clientes`
      let query = `SELECT * FROM "${schema}".clientes`
      const params: unknown[] = []
      const conditions: string[] = []

      if (filters.search) {
        conditions.push(`(nome_completo ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`)
        params.push(`%${filters.search}%`)
      }

      if (filters.idLoja) {
        // Suporta tanto um único id_loja quanto um array
        if (Array.isArray(filters.idLoja) && filters.idLoja.length > 0) {
          conditions.push(`id_loja = ANY($${params.length + 1}::int[])`)
          params.push(filters.idLoja)
        } else if (typeof filters.idLoja === 'number') {
          conditions.push(`id_loja = $${params.length + 1}`)
          params.push(filters.idLoja)
        }
      }

      if (conditions.length > 0) {
        const whereClause = ` WHERE ${conditions.join(' AND ')}`
        countQuery += whereClause
        query += whereClause
      }

      query += ` ORDER BY id_cliente DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      params.push(filters.limit, filters.offset)

      const countResult = await client.query<{ count: string }>(countQuery, params.slice(0, conditions.length > 0 ? params.length - 2 : 0))
      const count = parseInt(countResult.rows[0]?.count || '0', 10)

      const result = await client.query<ClienteRow>(query, params)

      return {
        rows: result.rows.map(mapRowToProps),
        count,
      }
    } finally {
      client.release()
    }
  }

  async findById(schema: string, id: number): Promise<ClienteProps | null> {
    const client = await pool.connect()
    try {
      const result = await client.query<ClienteRow>(
        `SELECT * FROM "${schema}".clientes WHERE id_cliente = $1`,
        [id]
      )
      return result.rows[0] ? mapRowToProps(result.rows[0]) : null
    } finally {
      client.release()
    }
  }

  async findByEmail(schema: string, email: string): Promise<ClienteProps | null> {
    const client = await pool.connect()
    try {
      const result = await client.query<ClienteRow>(
        `SELECT * FROM "${schema}".clientes WHERE LOWER(email) = LOWER($1)`,
        [email]
      )
      return result.rows[0] ? mapRowToProps(result.rows[0]) : null
    } finally {
      client.release()
    }
  }

  async findByWhatsApp(schema: string, whatsapp: string): Promise<ClienteProps | null> {
    const client = await pool.connect()
    try {
      // Normalizar WhatsApp removendo caracteres não numéricos
      const normalized = whatsapp.replace(/\D/g, '')
      const result = await client.query<ClienteRow>(
        `SELECT * FROM "${schema}".clientes WHERE REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', '') = $1`,
        [normalized]
      )
      return result.rows[0] ? mapRowToProps(result.rows[0]) : null
    } finally {
      client.release()
    }
  }

  async findByIdUsuario(schema: string, idUsuario: number): Promise<ClienteProps | null> {
    const client = await pool.connect()
    try {
      const result = await client.query<ClienteRow>(
        `SELECT * FROM "${schema}".clientes WHERE id_usuario = $1`,
        [idUsuario]
      )
      return result.rows[0] ? mapRowToProps(result.rows[0]) : null
    } finally {
      client.release()
    }
  }

  async create(schema: string, data: CreateClienteProps): Promise<ClienteProps> {
    const client = await pool.connect()
    try {
      const cliente = ClienteEntity.create(data)
      const props = cliente.toJSON()
      const result = await client.query<ClienteRow>(
        `INSERT INTO "${schema}".clientes 
         (id_usuario, id_loja, nome_completo, email, whatsapp, cep, sexo, saldo, aceite_termos, usu_cadastro, dt_cadastro)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         RETURNING *`,
        [
          props.id_usuario,
          props.id_loja,
          props.nome_completo,
          props.email,
          props.whatsapp,
          props.cep,
          props.sexo,
          props.saldo,
          props.aceite_termos,
          props.usu_cadastro,
        ]
      )
      return mapRowToProps(result.rows[0]!)
    } finally {
      client.release()
    }
  }

  async update(schema: string, id: number, data: UpdateClienteProps): Promise<ClienteProps | null> {
    const client = await pool.connect()
    try {
      const existing = await this.findById(schema, id)
      if (!existing) return null

      const cliente = ClienteEntity.restore(existing)
      cliente.update(data)
      const props = cliente.toJSON()

      const updates: string[] = []
      const values: unknown[] = []
      let paramIndex = 1

      if (typeof data.id_loja !== 'undefined') {
        updates.push(`id_loja = $${paramIndex++}`)
        values.push(data.id_loja)
      }
      if (typeof data.nome_completo !== 'undefined') {
        updates.push(`nome_completo = $${paramIndex++}`)
        values.push(data.nome_completo)
      }
      if (typeof data.email !== 'undefined') {
        updates.push(`email = $${paramIndex++}`)
        values.push(data.email)
      }
      if (typeof data.whatsapp !== 'undefined') {
        updates.push(`whatsapp = $${paramIndex++}`)
        values.push(data.whatsapp)
      }
      if (typeof data.cep !== 'undefined') {
        updates.push(`cep = $${paramIndex++}`)
        values.push(data.cep)
      }
      if (typeof data.sexo !== 'undefined') {
        updates.push(`sexo = $${paramIndex++}`)
        values.push(data.sexo)
      }
      if (typeof data.saldo !== 'undefined') {
        updates.push(`saldo = $${paramIndex++}`)
        values.push(data.saldo)
      }
      if (typeof data.aceite_termos !== 'undefined') {
        updates.push(`aceite_termos = $${paramIndex++}`)
        values.push(data.aceite_termos)
      }
      if (typeof data.usu_altera !== 'undefined') {
        updates.push(`usu_altera = $${paramIndex++}`)
        values.push(data.usu_altera)
      }

      if (updates.length === 0) {
        return await this.findById(schema, id)
      }

      updates.push(`dt_altera = NOW()`)
      values.push(id)

      const result = await client.query<ClienteRow>(
        `UPDATE "${schema}".clientes 
         SET ${updates.join(', ')}
         WHERE id_cliente = $${paramIndex}
         RETURNING *`,
        values
      )

      return result.rows[0] ? mapRowToProps(result.rows[0]) : null
    } finally {
      client.release()
    }
  }

  async delete(schema: string, id: number): Promise<boolean> {
    const client = await pool.connect()
    try {
      const result = await client.query(
        `DELETE FROM "${schema}".clientes WHERE id_cliente = $1`,
        [id]
      )
      return (result.rowCount ?? 0) > 0
    } finally {
      client.release()
    }
  }
}

