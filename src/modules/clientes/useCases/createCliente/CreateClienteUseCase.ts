import { AppError } from '../../../../core/errors/AppError'
import type { CreateClienteDTO } from '../../dto/CreateClienteDTO'
import type { IClienteRepository } from '../../repositories/IClienteRepository'
import { usuarioApiService } from '../../services/UsuarioApiService'

export class CreateClienteUseCase {
  constructor(
    private readonly clienteRepository: IClienteRepository,
  ) {}

  async execute(schemaName: string, data: CreateClienteDTO, token?: string) {
    // Verificar se já existe cliente com o mesmo email ou WhatsApp
    const existingByEmail = await this.clienteRepository.findByEmail(schemaName, data.email)
    if (existingByEmail) {
      throw new AppError('Email já cadastrado neste schema', 409)
    }

    const existingByWhatsApp = await this.clienteRepository.findByWhatsApp(schemaName, data.whatsapp)
    if (existingByWhatsApp) {
      throw new AppError('WhatsApp já cadastrado neste schema', 409)
    }

    // Criar usuário na API de usuários
    let idUsuario: number
    try {
      const usuarioResponse = await usuarioApiService.createClienteUsuario(
        {
          login: data.email,
          email: data.email,
          senha: data.senha,
        },
        token
      )
      idUsuario = parseInt(usuarioResponse.id, 10)
    } catch (error: any) {
      throw new AppError(`Erro ao criar usuário: ${error.message}`, 500)
    }

    // Criar cliente no banco
    const cliente = await this.clienteRepository.create(schemaName, {
      ...data,
      id_usuario: idUsuario,
      usu_cadastro: 1, // Será substituído pelo JWT depois
    })

    return cliente
  }
}

