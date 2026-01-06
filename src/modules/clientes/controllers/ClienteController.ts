import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../../../core/errors/AppError'
import { clienteRepository } from '../repositories'
import { CreateClienteUseCase } from '../useCases/createCliente/CreateClienteUseCase'
import { DeleteClienteUseCase } from '../useCases/deleteCliente/DeleteClienteUseCase'
import { GetClienteUseCase } from '../useCases/getCliente/GetClienteUseCase'
import { GetClienteByUsuarioUseCase } from '../useCases/getClienteByUsuario/GetClienteByUsuarioUseCase'
import { ListClientesUseCase } from '../useCases/listClientes/ListClientesUseCase'
import { UpdateClienteUseCase } from '../useCases/updateCliente/UpdateClienteUseCase'
import { createClienteSchema, updateClienteSchema } from '../validators/cliente.schema'
import { pool } from '../../../infra/database/pool'
import { createClientesItensRecompensaTable } from '../../../infra/database/migrations/migrationRunner'

export class ClienteController {
  private readonly listClientes: ListClientesUseCase
  private readonly getCliente: GetClienteUseCase
  private readonly getClienteByUsuario: GetClienteByUsuarioUseCase
  private readonly createCliente: CreateClienteUseCase
  private readonly updateCliente: UpdateClienteUseCase
  private readonly deleteCliente: DeleteClienteUseCase

  constructor() {
    this.listClientes = new ListClientesUseCase(clienteRepository)
    this.getCliente = new GetClienteUseCase(clienteRepository)
    this.getClienteByUsuario = new GetClienteByUsuarioUseCase(clienteRepository)
    this.createCliente = new CreateClienteUseCase(clienteRepository)
    this.updateCliente = new UpdateClienteUseCase(clienteRepository)
    this.deleteCliente = new DeleteClienteUseCase(clienteRepository)
  }

  index = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const limit = Math.min(Number(req.query.limit || 10), 100)
      const offset = Number(req.query.offset || 0)
      const search = typeof req.query.search === 'string' ? req.query.search : undefined
      const idLoja = req.query.id_loja ? Number(req.query.id_loja) : undefined

      const filters: { limit: number; offset: number; search?: string; idLoja?: number } = {
        limit,
        offset,
      }
      if (search) filters.search = search
      if (idLoja) filters.idLoja = idLoja

      const result = await this.listClientes.execute(schema, filters)
      return res.json({
        data: result.rows,
        pagination: {
          total: result.count,
          page: Math.floor(offset / limit) + 1,
          limit,
          totalPages: Math.ceil(result.count / limit),
        },
      })
    } catch (error) {
      return next(error)
    }
  }

  show = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const id = Number(req.params.id)
      const cliente = await this.getCliente.execute(schema, id)
      return res.json(cliente)
    } catch (error) {
      return next(error)
    }
  }

  showByUsuario = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const idUsuario = Number(req.params.idUsuario)
      const cliente = await this.getClienteByUsuario.execute(schema, idUsuario)
      return res.json(cliente)
    } catch (error) {
      return next(error)
    }
  }

  store = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const parseResult = createClienteSchema.safeParse(req.body)
      if (!parseResult.success) {
        throw new AppError('Falha de validação', 422, parseResult.error.flatten())
      }

      const token = req.headers.authorization

      const cliente = await this.createCliente.execute(schema, parseResult.data, token)
      return res.status(201).json(cliente)
    } catch (error) {
      return next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const id = Number(req.params.id)
      const parseResult = updateClienteSchema.safeParse(req.body)
      if (!parseResult.success) {
        throw new AppError('Falha de validação', 422, parseResult.error.flatten())
      }

      const userId = req.user?.userId ? parseInt(req.user.userId, 10) : 1

      // Filtrar propriedades undefined para evitar erros de tipo
      const updateData: {
        id_loja?: number
        nome_completo?: string
        email?: string
        whatsapp?: string
        cep?: string
        sexo?: 'M' | 'F'
        saldo?: number
        aceite_termos?: boolean
      } = {}
      if (parseResult.data.id_loja !== undefined) updateData.id_loja = parseResult.data.id_loja
      if (parseResult.data.nome_completo !== undefined) updateData.nome_completo = parseResult.data.nome_completo
      if (parseResult.data.email !== undefined) updateData.email = parseResult.data.email
      if (parseResult.data.whatsapp !== undefined) updateData.whatsapp = parseResult.data.whatsapp
      if (parseResult.data.cep !== undefined) updateData.cep = parseResult.data.cep
      if (parseResult.data.sexo !== undefined) updateData.sexo = parseResult.data.sexo
      if (parseResult.data.saldo !== undefined) updateData.saldo = parseResult.data.saldo
      if (parseResult.data.aceite_termos !== undefined) updateData.aceite_termos = parseResult.data.aceite_termos

      const cliente = await this.updateCliente.execute(schema, id, updateData, userId)
      return res.json(cliente)
    } catch (error) {
      return next(error)
    }
  }

  destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const id = Number(req.params.id)
      await this.deleteCliente.execute(schema, id)
      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  }

  getPontosRecompensas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const idCliente = Number(req.params.id)

      if (!idCliente || isNaN(idCliente)) {
        throw new AppError('ID do cliente inválido', 400)
      }

      const client = await pool.connect()
      try {
        const clienteResult = await client.query(
          `SELECT id_cliente, saldo FROM "${schema}".clientes WHERE id_cliente = $1`,
          [idCliente]
        )

        const cliente = clienteResult.rows[0]
        if (!cliente) {
          throw new AppError('Cliente não encontrado', 404)
        }

        // Catálogo de recompensas do tenant
        const recompensasResult = await client.query(
          `SELECT id_item_recompensa, nome_item, qtd_pontos, imagem_item, nao_retirar_loja 
           FROM "${schema}".itens_recompensa
           ORDER BY qtd_pontos ASC, id_item_recompensa ASC`
        )

        // Códigos de resgate pendentes (se a tabela existir)
        const codigosPendentesMap = new Map<number, string>()
        const tabelaCodigosExiste = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 
            AND table_name = 'clientes_itens_recompensa'
          )`,
          [schema]
        )

        if (tabelaCodigosExiste.rows[0]?.exists) {
          const codigosPendentesResult = await client.query(
            `SELECT id_item_recompensa, codigo_resgate
             FROM "${schema}".clientes_itens_recompensa
             WHERE id_cliente = $1
               AND (resgate_utilizado = false OR resgate_utilizado IS NULL)
             ORDER BY dt_cadastro DESC`,
            [idCliente]
          )

          codigosPendentesResult.rows.forEach((row) => {
            if (row.id_item_recompensa && row.codigo_resgate) {
              codigosPendentesMap.set(row.id_item_recompensa, row.codigo_resgate)
            }
          })
        } else {
          // Cria a tabela em background para futuras chamadas, mas não quebra a resposta atual
          createClientesItensRecompensaTable(schema).catch((migrationError) => {
            console.warn('[ClienteController] Erro ao criar tabela clientes_itens_recompensa:', migrationError)
          })
        }

        return res.json({
          quantidade_pontos: Number(cliente.saldo ?? 0),
          codigo_cliente: `CLI-${cliente.id_cliente}`,
          recompensas: recompensasResult.rows.map((item) => ({
            id_item_recompensa: item.id_item_recompensa,
            nome_item: item.nome_item,
            foto: item.imagem_item || null,
            qtd_pontos: Number(item.qtd_pontos),
            tipo: 'ITEM_RECOMPENSA',
            nao_retirar_loja: Boolean(item.nao_retirar_loja),
            codigo_resgate_pendente: codigosPendentesMap.get(item.id_item_recompensa) ?? null,
          })),
        })
      } finally {
        client.release()
      }
    } catch (error) {
      return next(error)
    }
  }

  creditarPontos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const idCliente = Number(req.params.id)
      const { tipo, pontos, valor_reais, origem, id_loja, observacao } = req.body

      // Validações
      if (!tipo || tipo !== 'CREDITO') {
        throw new AppError('Tipo de movimentação deve ser CREDITO', 400)
      }
      if (!origem) {
        throw new AppError('Origem é obrigatória', 400)
      }

      // Calcular pontos: 100 pontos por 1 real
      // Aceita tanto 'pontos' direto quanto 'valor_reais' para calcular
      let pontosCalculados: number
      if (pontos && pontos > 0) {
        // Se já veio calculado, usa o valor
        pontosCalculados = pontos
      } else if (valor_reais && valor_reais > 0) {
        // Se veio em reais, calcula: 100 pontos por 1 real
        pontosCalculados = Math.floor(valor_reais * 100)
      } else {
        throw new AppError('É necessário informar pontos ou valor_reais', 400)
      }

      if (pontosCalculados <= 0) {
        throw new AppError('Pontos devem ser um número positivo', 400)
      }

      // Buscar cliente
      const cliente = await this.getCliente.execute(schema, idCliente)

      // Calcular novo saldo
      const novoSaldo = cliente.saldo + pontosCalculados

      const userId = req.user?.userId ? parseInt(req.user.userId, 10) : 1

      // Atualizar saldo do cliente e inserir movimentação em uma transação
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        // Atualizar saldo do cliente
        const clienteAtualizado = await this.updateCliente.execute(
          schema,
          idCliente,
          { saldo: novoSaldo },
          userId
        )

        if (!clienteAtualizado) {
          await client.query('ROLLBACK')
          throw new AppError('Erro ao atualizar saldo do cliente', 500)
        }

        // Inserir movimentação na tabela
        const movimentacaoResult = await client.query(
          `INSERT INTO "${schema}".cliente_pontos_movimentacao 
           (id_cliente, tipo, pontos, saldo_resultante, origem, id_loja, observacao, usu_cadastro, dt_cadastro)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           RETURNING id_movimentacao, pontos, saldo_resultante`,
          [
            idCliente,
            'CREDITO',
            pontosCalculados,
            novoSaldo,
            origem,
            id_loja || null,
            observacao || null,
            userId,
          ]
        )

        await client.query('COMMIT')

        const movimentacao = movimentacaoResult.rows[0]

        // Disparar email de atualização de pontos (não bloquear se falhar)
        const { comunicacoesService } = await import('../services/ComunicacoesService')
        comunicacoesService.dispararAtualizacaoPontos(
          schema,
          {
            id_cliente: cliente.id_cliente,
            nome_completo: cliente.nome_completo,
            email: cliente.email,
            pontos_acumulados: pontosCalculados,
            total_pontos: novoSaldo,
          },
          req.headers.authorization?.replace('Bearer ', '')
        ).catch((error) => {
          console.error('Erro ao disparar email de atualização de pontos:', error)
        })

        // Retornar resposta no formato esperado pela API v1
        return res.status(201).json({
          movimentacao: {
            id_movimentacao: movimentacao.id_movimentacao,
            pontos: movimentacao.pontos,
            saldo_resultante: movimentacao.saldo_resultante,
          },
          saldo_atual: novoSaldo,
        })
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    } catch (error) {
      return next(error)
    }
  }

  debitarPontos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const idCliente = Number(req.params.id)
      const { id_item_recompensa, observacao } = req.body

      // Validações
      if (!id_item_recompensa) {
        throw new AppError('ID do item de recompensa é obrigatório', 400)
      }

      // Buscar item de recompensa e verificar tabela antes de iniciar a transação
      const preCheckClient = await pool.connect()
      let itemRecompensa: {
        id_item_recompensa?: number
        nome_item?: string
        qtd_pontos?: number
        nao_retirar_loja?: boolean
        descricao?: string
      } | null = null

      try {
        // Buscar item de recompensa diretamente do banco de dados
        const itemResult = await preCheckClient.query(
          `SELECT id_item_recompensa, nome_item, qtd_pontos, nao_retirar_loja, descricao 
           FROM "${schema}".itens_recompensa 
           WHERE id_item_recompensa = $1`,
          [id_item_recompensa]
        )

        if (itemResult.rows.length === 0) {
          throw new AppError('Item de recompensa não encontrado', 404)
        }

        itemRecompensa = itemResult.rows[0]

        // Verificar se a tabela existe, se não existir, criar antes de iniciar a transação
        const tableCheck = await preCheckClient.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 
            AND table_name = 'clientes_itens_recompensa'
          )`,
          [schema]
        )

        if (!tableCheck.rows[0].exists) {
          // Criar tabela se não existir (fora da transação principal)
          const migrationResult = await createClientesItensRecompensaTable(schema)
          
          if (!migrationResult.success) {
            throw new AppError(`Erro ao criar tabela de códigos de resgate: ${migrationResult.message}`, 500)
          }
        }
      } finally {
        preCheckClient.release()
      }

      // Garantir que itemRecompensa não é null (já verificamos acima)
      if (!itemRecompensa) {
        throw new AppError('Item de recompensa não encontrado', 404)
      }

      const pontosNecessarios = itemRecompensa.qtd_pontos

      if (!pontosNecessarios || pontosNecessarios <= 0) {
        throw new AppError('Item de recompensa não possui pontos válidos', 400)
      }

      // Buscar cliente
      const cliente = await this.getCliente.execute(schema, idCliente)

      // Verificar saldo suficiente
      if (cliente.saldo < pontosNecessarios) {
        throw new AppError('Saldo insuficiente para débito', 409)
      }

      // Calcular novo saldo
      const novoSaldo = cliente.saldo - pontosNecessarios

      const userId = req.user?.userId ? parseInt(req.user.userId, 10) : 1

      // Atualizar saldo do cliente e inserir movimentação em uma transação
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        // Atualizar saldo do cliente
        const clienteAtualizado = await this.updateCliente.execute(
          schema,
          idCliente,
          { saldo: novoSaldo },
          userId
        )

        if (!clienteAtualizado) {
          await client.query('ROLLBACK')
          throw new AppError('Erro ao atualizar saldo do cliente', 500)
        }

        // Inserir movimentação na tabela
        const movimentacaoResult = await client.query(
          `INSERT INTO "${schema}".cliente_pontos_movimentacao 
           (id_cliente, tipo, pontos, saldo_resultante, origem, id_item_recompensa, observacao, usu_cadastro, dt_cadastro)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           RETURNING id_movimentacao, pontos, saldo_resultante`,
          [
            idCliente,
            'DEBITO',
            pontosNecessarios,
            novoSaldo,
            'RESGATE',
            id_item_recompensa,
            observacao || `Resgate de ${itemRecompensa.nome_item || 'item'}`,
            userId,
          ]
        )

        const movimentacao = movimentacaoResult.rows[0]

        // Gerar código de resgate único (5 caracteres alfanuméricos)
        const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let codigoResgate: string
        let tentativas = 0
        const maxTentativas = 100

        do {
          codigoResgate = Array.from({ length: 5 }, () =>
            caracteres.charAt(Math.floor(Math.random() * caracteres.length))
          ).join('')

          // Verificar se o código já existe
          const codigoExistente = await client.query(
            `SELECT codigo_resgate FROM "${schema}".clientes_itens_recompensa 
             WHERE codigo_resgate = $1 LIMIT 1`,
            [codigoResgate]
          )

          if (codigoExistente.rows.length === 0) {
            break // Código único encontrado
          }

          tentativas++
        } while (tentativas < maxTentativas)

        if (tentativas >= maxTentativas) {
          await client.query('ROLLBACK')
          throw new AppError('Falha ao gerar código único para resgate', 500)
        }

        // Inserir código de resgate na tabela clientes_itens_recompensa
        await client.query(
          `INSERT INTO "${schema}".clientes_itens_recompensa 
           (id_cliente, id_item_recompensa, id_movimentacao, codigo_resgate, schema, resgate_utilizado, usu_cadastro, dt_cadastro)
           VALUES ($1, $2, $3, $4, $5, false, $6, NOW())`,
          [
            idCliente,
            id_item_recompensa,
            movimentacao.id_movimentacao,
            codigoResgate,
            schema,
            userId,
          ]
        )

        await client.query('COMMIT')

        // Disparar email de resgate (não bloquear se falhar)
        const { comunicacoesService } = await import('../services/ComunicacoesService')
        const token = req.headers.authorization?.replace('Bearer ', '')
        
        // Se o item NÃO pode ser retirado em loja, disparar email para grupo ADM-FRANQUIA
        if (itemRecompensa.nao_retirar_loja) {
          comunicacoesService.dispararResgateNaoRetirarLoja(
            schema,
            {
              id_cliente: cliente.id_cliente,
              nome_completo: cliente.nome_completo,
              email: cliente.email,
              whatsapp: cliente.whatsapp,
              cep: cliente.cep,
              saldo_pontos: novoSaldo,
              codigo_resgate: codigoResgate,
              item_nome: itemRecompensa.nome_item || '',
              item_descricao: itemRecompensa.descricao || '',
              item_qtd_pontos: pontosNecessarios,
              pontos_apos_resgate: novoSaldo,
            },
            token
          ).catch((error) => {
            console.error('Erro ao disparar email de resgate não retirar loja:', error)
          })
        } else {
          // Se o item PODE ser retirado em loja, disparar email de resgate normal para o cliente
          comunicacoesService.dispararResgate(
            schema,
            {
              id_cliente: cliente.id_cliente,
              nome_completo: cliente.nome_completo,
              email: cliente.email,
              codigo_resgate: codigoResgate,
              item_nome: itemRecompensa.nome_item || '',
              pontos_apos_resgate: novoSaldo,
            },
            token
          ).catch((error) => {
            console.error('Erro ao disparar email de resgate:', error)
          })
        }

        // Retornar resposta no formato esperado pela API v1
        return res.status(201).json({
          movimentacao: {
            id_movimentacao: movimentacao.id_movimentacao,
            pontos: movimentacao.pontos,
            saldo_resultante: movimentacao.saldo_resultante,
          },
          saldo_atual: novoSaldo,
          codigo_resgate: codigoResgate,
          resgate_utilizado: false,
        })
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    } catch (error) {
      return next(error)
    }
  }

  buscarCodigoPorClienteItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const idCliente = Number(req.params.id)
      const idItemRecompensa = Number(req.params.idItemRecompensa)

      if (!idItemRecompensa) {
        throw new AppError('ID do item de recompensa é obrigatório', 400)
      }

      // Buscar código de resgate não utilizado para este cliente e item
      const client = await pool.connect()
      try {
        // Verificar se a tabela existe, se não existir, criar
        const tableCheck = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 
            AND table_name = 'clientes_itens_recompensa'
          )`,
          [schema]
        )

        if (!tableCheck.rows[0].exists) {
          // Tabela não existe, criar automaticamente
          try {
            const result = await createClientesItensRecompensaTable(schema)
            
            if (!result.success) {
              console.error(`[ClienteController] Erro ao criar tabela: ${result.message}`)
              return res.status(404).json({
                status: 'error',
                message: 'Código de resgate não encontrado',
              })
            }
          } catch (migrationError: any) {
            console.error(`[ClienteController] Erro ao executar migration:`, migrationError)
            return res.status(404).json({
              status: 'error',
              message: 'Código de resgate não encontrado',
            })
          }
        }

        const result = await client.query(
          `SELECT 
            cir.codigo_resgate,
            cir.resgate_utilizado,
            cir.id_cliente,
            cir.id_item_recompensa,
            cir.id_movimentacao,
            c.saldo as saldo_atual,
            m.pontos,
            m.saldo_resultante
           FROM "${schema}".clientes_itens_recompensa cir
           INNER JOIN "${schema}".clientes c ON c.id_cliente = cir.id_cliente
           LEFT JOIN "${schema}".cliente_pontos_movimentacao m ON m.id_movimentacao = cir.id_movimentacao
           WHERE cir.id_cliente = $1 
             AND cir.id_item_recompensa = $2 
             AND (cir.resgate_utilizado = false OR cir.resgate_utilizado IS NULL)
           ORDER BY cir.dt_cadastro DESC
           LIMIT 1`,
          [idCliente, idItemRecompensa]
        )

        if (result.rows.length === 0) {
          return res.status(404).json({
            status: 'error',
            message: 'Código de resgate não encontrado',
          })
        }

        const registro = result.rows[0]

        return res.json({
          codigo_resgate: registro.codigo_resgate,
          resgate_utilizado: registro.resgate_utilizado || false,
          id_cliente: registro.id_cliente,
          id_item_recompensa: registro.id_item_recompensa,
          id_movimentacao: registro.id_movimentacao,
          saldo_atual: registro.saldo_atual,
          pontos: registro.pontos || 0,
          saldo_resultante: registro.saldo_resultante || registro.saldo_atual,
        })
      } finally {
        client.release()
      }
    } catch (error) {
      return next(error)
    }
  }

  buscarCodigoResgate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const codigoResgate = req.params.codigoResgate?.toUpperCase().trim()

      if (!codigoResgate || codigoResgate.length !== 5) {
        throw new AppError('Código de resgate deve ter 5 caracteres', 400)
      }

      // Buscar código de resgate pelo código
      const client = await pool.connect()
      try {
        // Verificar se a tabela existe, se não existir, criar
        const tableCheck = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 
            AND table_name = 'clientes_itens_recompensa'
          )`,
          [schema]
        )

        if (!tableCheck.rows[0].exists) {
          // Tabela não existe, criar automaticamente
          try {
            const result = await createClientesItensRecompensaTable(schema)
            
            if (!result.success) {
              console.error(`[ClienteController] Erro ao criar tabela: ${result.message}`)
              return res.status(404).json({
                status: 'error',
                message: 'Código de resgate não encontrado',
              })
            }
          } catch (migrationError: any) {
            console.error(`[ClienteController] Erro ao executar migration:`, migrationError)
            return res.status(404).json({
              status: 'error',
              message: 'Código de resgate não encontrado',
            })
          }
        }

        // Buscar código de resgate com informações do cliente e item
        const result = await client.query(
          `SELECT 
            cir.codigo_resgate,
            cir.resgate_utilizado,
            cir.id_cliente,
            cir.id_item_recompensa,
            cir.id_movimentacao,
            c.nome_completo as cliente_nome,
            c.saldo as cliente_saldo,
            ir.nome_item as item_nome,
            m.pontos,
            m.saldo_resultante
           FROM "${schema}".clientes_itens_recompensa cir
           INNER JOIN "${schema}".clientes c ON c.id_cliente = cir.id_cliente
           LEFT JOIN "${schema}".itens_recompensa ir ON ir.id_item_recompensa = cir.id_item_recompensa
           LEFT JOIN "${schema}".cliente_pontos_movimentacao m ON m.id_movimentacao = cir.id_movimentacao
           WHERE cir.codigo_resgate = $1`,
          [codigoResgate]
        )

        if (result.rows.length === 0) {
          return res.status(404).json({
            status: 'error',
            message: 'Código de resgate não encontrado',
          })
        }

        const registro = result.rows[0]

        return res.json({
          codigo_resgate: registro.codigo_resgate,
          resgate_utilizado: registro.resgate_utilizado || false,
          id_cliente: registro.id_cliente,
          id_item_recompensa: registro.id_item_recompensa,
          id_movimentacao: registro.id_movimentacao,
          cliente_nome: registro.cliente_nome,
          cliente_saldo: registro.cliente_saldo,
          item_nome: registro.item_nome,
        })
      } finally {
        client.release()
      }
    } catch (error) {
      return next(error)
    }
  }

  marcarCodigoComoUtilizado = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const idCliente = Number(req.params.id)
      const codigoResgate = req.params.codigoResgate?.toUpperCase().trim()

      if (!codigoResgate || codigoResgate.length !== 5) {
        throw new AppError('Código de resgate deve ter 5 caracteres', 400)
      }

      const userId = req.user?.userId ? parseInt(req.user.userId, 10) : 1

      // Marcar código como utilizado
      const client = await pool.connect()
      try {
        // Verificar se a tabela existe
        const tableCheck = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 
            AND table_name = 'clientes_itens_recompensa'
          )`,
          [schema]
        )

        if (!tableCheck.rows[0].exists) {
          return res.status(404).json({
            status: 'error',
            message: 'Código de resgate não encontrado',
          })
        }

        // Buscar o código de resgate
        const result = await client.query(
          `SELECT 
            id_cliente_item_recompensa,
            id_cliente,
            id_item_recompensa,
            id_movimentacao,
            resgate_utilizado
           FROM "${schema}".clientes_itens_recompensa
           WHERE codigo_resgate = $1`,
          [codigoResgate]
        )

        if (result.rows.length === 0) {
          return res.status(404).json({
            status: 'error',
            message: 'Código de resgate não encontrado',
          })
        }

        const registro = result.rows[0]

        // Verificar se já foi utilizado
        if (registro.resgate_utilizado) {
          return res.status(409).json({
            status: 'error',
            message: 'Código de resgate já foi utilizado',
          })
        }

        // Verificar se o código pertence ao cliente informado (se fornecido)
        if (idCliente && registro.id_cliente !== idCliente) {
          return res.status(403).json({
            status: 'error',
            message: 'Código de resgate não pertence a este cliente',
          })
        }

        // Marcar como utilizado
        await client.query(
          `UPDATE "${schema}".clientes_itens_recompensa 
           SET resgate_utilizado = true
           WHERE codigo_resgate = $1`,
          [codigoResgate]
        )

        return res.json({
          status: 'success',
          codigo_resgate: codigoResgate,
          resgate_utilizado: true,
          id_cliente: registro.id_cliente,
          id_item_recompensa: registro.id_item_recompensa,
          id_movimentacao: registro.id_movimentacao,
        })
      } finally {
        client.release()
      }
    } catch (error) {
      return next(error)
    }
  }

  getMovimentacoes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const idCliente = Number(req.params.id)
      const page = Math.max(Number(req.query.page || 1), 1)
      const limit = Math.min(Number(req.query.limit || 10), 100)
      const offset = (page - 1) * limit
      const order = req.query.order === 'asc' ? 'ASC' : 'DESC'
      const tipo = req.query.tipo as string | undefined
      const origem = req.query.origem as string | undefined
      const dtIni = req.query.dt_ini as string | undefined
      const dtFim = req.query.dt_fim as string | undefined

      if (!idCliente || isNaN(idCliente)) {
        throw new AppError('ID do cliente inválido', 400)
      }

      const client = await pool.connect()
      try {
        // Construir query com filtros
        let whereConditions = [`m.id_cliente = $1`]
        const queryParams: any[] = [idCliente]
        let paramIndex = 2

        if (tipo) {
          whereConditions.push(`m.tipo = $${paramIndex}`)
          queryParams.push(tipo)
          paramIndex++
        }

        if (origem) {
          whereConditions.push(`m.origem = $${paramIndex}`)
          queryParams.push(origem)
          paramIndex++
        }

        if (dtIni) {
          whereConditions.push(`m.dt_cadastro >= $${paramIndex}`)
          queryParams.push(dtIni)
          paramIndex++
        }

        if (dtFim) {
          whereConditions.push(`m.dt_cadastro <= $${paramIndex}`)
          queryParams.push(dtFim)
          paramIndex++
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

        // Buscar total de registros
        const countResult = await client.query(
          `SELECT COUNT(*) as total 
           FROM "${schema}".cliente_pontos_movimentacao m
           ${whereClause}`,
          queryParams
        )
        const total = parseInt(countResult.rows[0]?.total || '0', 10)

        // Buscar movimentações
        const result = await client.query(
          `SELECT 
             m.id_movimentacao,
             m.id_cliente,
             m.tipo,
             m.pontos,
             m.saldo_resultante,
             m.origem,
             m.id_loja,
             m.id_item_recompensa,
             m.observacao,
             m.dt_cadastro,
             m.usu_cadastro
           FROM "${schema}".cliente_pontos_movimentacao m
           ${whereClause}
           ORDER BY m.dt_cadastro ${order}
           LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
          [...queryParams, limit, offset]
        )

        return res.json({
          data: result.rows.map((row) => ({
            id_movimentacao: row.id_movimentacao,
            id_cliente: row.id_cliente,
            tipo: row.tipo,
            pontos: Number(row.pontos),
            saldo_resultante: Number(row.saldo_resultante),
            origem: row.origem,
            id_loja: row.id_loja ? Number(row.id_loja) : undefined,
            id_item_recompensa: row.id_item_recompensa ? Number(row.id_item_recompensa) : null,
            observacao: row.observacao || null,
            dt_cadastro: row.dt_cadastro,
            usu_cadastro: Number(row.usu_cadastro),
          })),
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        })
      } finally {
        client.release()
      }
    } catch (error) {
      return next(error)
    }
  }

  getDetalhesResgate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const idResgate = Number(req.params.idResgate)

      if (!idResgate || isNaN(idResgate)) {
        throw new AppError('ID do resgate inválido', 400)
      }

      const client = await pool.connect()
      try {
        // Verificar se a tabela existe, se não existir, criar
        const tableCheck = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 
            AND table_name = 'clientes_itens_recompensa'
          )`,
          [schema]
        )

        if (!tableCheck.rows[0].exists) {
          try {
            const result = await createClientesItensRecompensaTable(schema)
            if (!result.success) {
              return res.status(404).json({
                status: 'error',
                message: 'Resgate não encontrado',
              })
            }
          } catch (migrationError: any) {
            console.error(`[ClienteController] Erro ao executar migration:`, migrationError)
            return res.status(404).json({
              status: 'error',
              message: 'Resgate não encontrado',
            })
          }
        }

        // Buscar detalhes do resgate por id_cliente_item_recompensa
        const result = await client.query(
          `SELECT 
            cir.id_cliente_item_recompensa as id_resgate,
            cir.codigo_resgate,
            cir.resgate_utilizado,
            cir.id_cliente,
            cir.id_item_recompensa,
            cir.id_movimentacao,
            cir.dt_cadastro as dt_resgate,
            c.nome_completo as cliente_nome,
            c.email as cliente_email,
            c.whatsapp as cliente_whatsapp,
            c.saldo as cliente_saldo,
            ir.nome_item as item_nome,
            ir.descricao as item_descricao,
            ir.qtd_pontos as item_pontos,
            ir.nao_retirar_loja as item_nao_retirar_loja,
            m.pontos as pontos_utilizados,
            m.saldo_resultante,
            m.observacao,
            m.dt_cadastro as dt_movimentacao
           FROM "${schema}".clientes_itens_recompensa cir
           INNER JOIN "${schema}".clientes c ON c.id_cliente = cir.id_cliente
           LEFT JOIN "${schema}".itens_recompensa ir ON ir.id_item_recompensa = cir.id_item_recompensa
           LEFT JOIN "${schema}".cliente_pontos_movimentacao m ON m.id_movimentacao = cir.id_movimentacao
           WHERE cir.id_cliente_item_recompensa = $1`,
          [idResgate]
        )

        if (result.rows.length === 0) {
          return res.status(404).json({
            status: 'error',
            message: 'Resgate não encontrado',
          })
        }

        const registro = result.rows[0]

        return res.json({
          id_resgate: registro.id_resgate,
          codigo_resgate: registro.codigo_resgate,
          resgate_utilizado: registro.resgate_utilizado || false,
          id_cliente: registro.id_cliente,
          id_item_recompensa: registro.id_item_recompensa,
          id_movimentacao: registro.id_movimentacao,
          dt_resgate: registro.dt_resgate,
          dt_utilizado: null,
          cliente: {
            id_cliente: registro.id_cliente,
            nome: registro.cliente_nome,
            email: registro.cliente_email,
            whatsapp: registro.cliente_whatsapp,
            saldo: registro.cliente_saldo,
          },
          item: {
            id_item_recompensa: registro.id_item_recompensa,
            nome: registro.item_nome,
            descricao: registro.item_descricao,
            quantidade_pontos: registro.item_pontos,
            nao_retirar_loja: registro.item_nao_retirar_loja,
          },
          movimentacao: {
            pontos: registro.pontos_utilizados,
            saldo_resultante: registro.saldo_resultante,
            observacao: registro.observacao,
            dt_cadastro: registro.dt_movimentacao,
          },
          status: registro.resgate_utilizado ? 'entregue' : 'pendente',
        })
      } finally {
        client.release()
      }
    } catch (error) {
      return next(error)
    }
  }
}

export const clienteController = new ClienteController()

