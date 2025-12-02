import axios from 'axios'
import { env } from '../../../config/env'

export class UsuarioApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = env.apiUsuarios.url.replace(/\/api\/?$/, '')
  }

  async createClienteUsuario(data: { login: string; email: string; senha: string }, token?: string): Promise<{ id: string }> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
      }

      const response = await axios.post(
        `${this.baseUrl}/api/users/clientes/publico`,
        {
          login: data.login,
          email: data.email,
          password: data.senha,
        },
        { headers }
      )

      return { id: response.data.id }
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Se o usuário já existe, buscar pelo email
        return this.findUsuarioByEmail(data.email, token)
      }
      throw new Error(`Erro ao criar/buscar usuário: ${error.response?.data?.message || error.message}`)
    }
  }

  private async findUsuarioByEmail(email: string, token?: string): Promise<{ id: string }> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
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

