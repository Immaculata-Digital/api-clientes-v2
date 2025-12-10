import axios from 'axios'
import { env } from '../../../../config/env'

interface ClienteData {
  id_cliente: number
  nome_completo: string
  email: string
  codigo_cliente?: string
  saldo_pontos?: number
  pontos_acumulados?: number
  total_pontos?: number
  codigo_resgate?: string
  item_nome?: string
  pontos_apos_resgate?: number
  token_reset?: string
}

export class ComunicacoesService {
  /**
   * Dispara email de boas-vindas quando um cliente se cadastra
   */
  async dispararBoasVindas(schema: string, cliente: ClienteData, token?: string): Promise<void> {
    try {
      await axios.post(
        `${env.apiComunicacoes.url}/${schema}/disparo-automatico`,
        {
          tipo_envio: 'boas_vindas',
          cliente: {
            id_cliente: cliente.id_cliente,
            nome_completo: cliente.nome_completo,
            email: cliente.email,
            codigo_cliente: cliente.codigo_cliente,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      )
    } catch (error: any) {
      // Não lançar erro para não quebrar o fluxo de cadastro
      console.error('Erro ao disparar email de boas-vindas:', error.message)
    }
  }

  /**
   * Dispara email de atualização de pontos quando há crédito
   */
  async dispararAtualizacaoPontos(
    schema: string,
    cliente: ClienteData,
    token?: string
  ): Promise<void> {
    try {
      await axios.post(
        `${env.apiComunicacoes.url}/${schema}/disparo-automatico`,
        {
          tipo_envio: 'atualizacao_pontos',
          cliente: {
            id_cliente: cliente.id_cliente,
            nome_completo: cliente.nome_completo,
            email: cliente.email,
            pontos_acumulados: cliente.pontos_acumulados,
            total_pontos: cliente.total_pontos || cliente.saldo_pontos,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      )
    } catch (error: any) {
      console.error('Erro ao disparar email de atualização de pontos:', error.message)
    }
  }

  /**
   * Dispara email de resgate quando há débito de pontos
   */
  async dispararResgate(schema: string, cliente: ClienteData, token?: string): Promise<void> {
    try {
      await axios.post(
        `${env.apiComunicacoes.url}/${schema}/disparo-automatico`,
        {
          tipo_envio: 'resgate',
          cliente: {
            id_cliente: cliente.id_cliente,
            nome_completo: cliente.nome_completo,
            email: cliente.email,
            codigo_resgate: cliente.codigo_resgate,
            item_nome: cliente.item_nome,
            pontos_apos_resgate: cliente.pontos_apos_resgate || cliente.saldo_pontos,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      )
    } catch (error: any) {
      console.error('Erro ao disparar email de resgate:', error.message)
    }
  }
}

export const comunicacoesService = new ComunicacoesService()

