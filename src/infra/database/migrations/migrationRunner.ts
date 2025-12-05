import { pool } from '../pool'

interface MigrationResult {
  success: boolean
  message: string
  schema?: string
}

/**
 * Executa migrations em um schema específico
 * Agora usa a função create_tenant_tables do sistema de migrations centralizado
 */
export async function runMigrations(schemaName: string): Promise<MigrationResult> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')

    // Criar schema se não existir
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)

    // Executar a função create_tenant_tables que cria todas as tabelas do tenant
    // incluindo clientes_itens_recompensa
    const result = await client.query(`SELECT create_tenant_tables($1)`, [schemaName])

    await client.query('COMMIT')

    return {
      success: true,
      message: `Migration executada com sucesso no schema ${schemaName}: ${result.rows[0]?.create_tenant_tables || ''}`,
      schema: schemaName,
    }
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error(`[Migration] Erro ao executar migration no schema ${schemaName}:`, error)
    return {
      success: false,
      message: `Erro ao executar migration: ${error.message}`,
      schema: schemaName,
    }
  } finally {
    client.release()
  }
}

/**
 * Verifica se a tabela existe no schema
 */
export async function tableExists(schemaName: string, tableName: string): Promise<boolean> {
  const client = await pool.connect()
  
  try {
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = $2
      )`,
      [schemaName, tableName]
    )
    
    return result.rows[0].exists
  } catch (error) {
    console.error(`[Migration] Erro ao verificar tabela ${tableName} no schema ${schemaName}:`, error)
    return false
  } finally {
    client.release()
  }
}

/**
 * Cria a tabela diretamente sem usar função (método alternativo)
 */
export async function createClientesItensRecompensaTable(schemaName: string): Promise<MigrationResult> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')

    // Criar schema se não existir
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)

    // Verificar se a tabela já existe
    const exists = await tableExists(schemaName, 'clientes_itens_recompensa')
    if (exists) {
      await client.query('COMMIT')
      return {
        success: true,
        message: `Tabela clientes_itens_recompensa já existe no schema ${schemaName}`,
        schema: schemaName,
      }
    }

    // Criar a tabela
    await client.query(`
      CREATE TABLE "${schemaName}".clientes_itens_recompensa (
        id_cliente_item_recompensa SERIAL PRIMARY KEY,
        id_cliente INTEGER NOT NULL,
        id_item_recompensa INTEGER NOT NULL,
        id_movimentacao INTEGER,
        codigo_resgate VARCHAR(5) NOT NULL,
        schema VARCHAR(50) NOT NULL,
        resgate_utilizado BOOLEAN DEFAULT false,
        dt_cadastro TIMESTAMP DEFAULT NOW(),
        usu_cadastro INTEGER NOT NULL,
        
        -- Constraints
        CONSTRAINT fk_cliente FOREIGN KEY (id_cliente) REFERENCES "${schemaName}".clientes(id_cliente) ON DELETE CASCADE,
        CONSTRAINT fk_item_recompensa FOREIGN KEY (id_item_recompensa) REFERENCES "${schemaName}".itens_recompensa(id_item_recompensa) ON DELETE CASCADE,
        CONSTRAINT fk_movimentacao FOREIGN KEY (id_movimentacao) REFERENCES "${schemaName}".cliente_pontos_movimentacao(id_movimentacao) ON DELETE SET NULL,
        CONSTRAINT uk_codigo_resgate UNIQUE (codigo_resgate)
      )
    `)

    // Criar índices
    await client.query(`
      CREATE INDEX idx_clientes_itens_recompensa_cliente ON "${schemaName}".clientes_itens_recompensa(id_cliente)
    `)
    
    await client.query(`
      CREATE INDEX idx_clientes_itens_recompensa_item ON "${schemaName}".clientes_itens_recompensa(id_item_recompensa)
    `)
    
    await client.query(`
      CREATE INDEX idx_clientes_itens_recompensa_cliente_item ON "${schemaName}".clientes_itens_recompensa(id_cliente, id_item_recompensa)
    `)
    
    await client.query(`
      CREATE INDEX idx_clientes_itens_recompensa_utilizado ON "${schemaName}".clientes_itens_recompensa(resgate_utilizado) WHERE resgate_utilizado = false
    `)
    
    await client.query(`
      CREATE INDEX idx_clientes_itens_recompensa_codigo ON "${schemaName}".clientes_itens_recompensa(codigo_resgate)
    `)

    await client.query('COMMIT')

    return {
      success: true,
      message: `Tabela clientes_itens_recompensa criada com sucesso no schema ${schemaName}`,
      schema: schemaName,
    }
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error(`[Migration] Erro ao criar tabela no schema ${schemaName}:`, error)
    return {
      success: false,
      message: `Erro ao criar tabela: ${error.message}`,
      schema: schemaName,
    }
  } finally {
    client.release()
  }
}

