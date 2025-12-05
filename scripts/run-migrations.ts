#!/usr/bin/env ts-node

/**
 * Script para executar migrations manualmente
 * 
 * Uso:
 *   npm run migrate -- casona
 *   ou
 *   ts-node scripts/run-migrations.ts casona
 */

import { createClientesItensRecompensaTable } from '../src/infra/database/migrations/migrationRunner'

const schemaName = process.argv[2] || 'casona'

async function main() {
  console.log(`🚀 Executando migration para schema: ${schemaName}`)
  
  const result = await createClientesItensRecompensaTable(schemaName)
  
  if (result.success) {
    console.log(`✅ ${result.message}`)
    process.exit(0)
  } else {
    console.error(`❌ ${result.message}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Erro ao executar migration:', error)
  process.exit(1)
})

