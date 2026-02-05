import axios from 'axios'
import { env } from '../../../config/env'

export class UsuarioApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = env.apiUsuarios.url.replace(/\/api\/?$/, '')
  }

  async createClienteUsuario(data: { login: string; email: string; senha: string; nome?: string }, schema: string, token?: string): Promise<{ id: string }> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-schema': schema,
      }

      if (token) {
        headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
      }

      const response = await axios.post(
        `${this.baseUrl}/api/users/clientes/publico`,
        {
          login: data.login,
          email: data.email,
          senha: data.senha,
          nome: data.nome,
          schema: schema,
        },
        { headers }
      )

      return { id: response.data.id }
    } catch (error: any) {
      // Log detalhado do erro para debug
      console.error('[UsuarioApiService] Erro ao criar usuário:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: `${this.baseUrl}/api/users/clientes/publico`,
        schema: schema,
        code: error.code,
        stack: error.stack,
      })

      if (error.response?.status === 409) {
        // Se o usuário já existe e temos token, buscar pelo email
        // Se não temos token (processo público), não podemos buscar - lançar erro
        if (!token) {
          const errorMessage = error.response?.data?.message || 'Usuário já cadastrado'
          throw new Error(`Erro ao criar usuário: ${errorMessage}`)
        }
        // Se temos token, tentar buscar o usuário existente
        return this.findUsuarioByEmail(data.email, schema, token)
      }

      // Melhorar mensagem de erro com mais detalhes
      const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
      const errorStatus = error.response?.status ? ` (Status: ${error.response.status})` : ''
      const errorDetails = error.response?.data?.details ? ` - Detalhes: ${JSON.stringify(error.response.data.details)}` : ''

      throw new Error(`Erro ao criar/buscar usuário: ${errorMessage}${errorStatus}${errorDetails}`)
    }
  }

  private async findUsuarioByEmail(email: string, schema: string, token?: string): Promise<{ id: string }> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-schema': schema,
      }

      if (token) {
        headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
      }

      // Buscar usuário por email na API de usuários
      const response = await axios.get(
        `${this.baseUrl}/api/users/buscar-por-texto?q=${encodeURIComponent(email)}`,
        { headers }
      )

      const users = response.data.data || []
      const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())

      if (!user) {
        throw new Error('Usuário não encontrado')
      }

      return { id: user.id }
    } catch (error: any) {
      throw new Error(`Erro ao buscar usuário existente: ${error.response?.data?.message || error.message}`)
    }
  }
}

export const usuarioApiService = new UsuarioApiService()

