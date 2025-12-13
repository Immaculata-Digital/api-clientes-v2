import { AppError } from '../../../../core/errors/AppError'
import type { CreateClienteDTO } from '../../dto/CreateClienteDTO'
import type { IClienteRepository } from '../../repositories/IClienteRepository'
import { usuarioApiService } from '../../services/UsuarioApiService'
import { comunicacoesService } from '../../services/ComunicacoesService'

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

    // Disparar email de boas-vindas (não bloquear se falhar)
    comunicacoesService.dispararBoasVindas(
      schemaName,
      {
        id_cliente: cliente.id_cliente,
        nome_completo: cliente.nome_completo,
        email: cliente.email,
        codigo_cliente: cliente.codigo_cliente || `CLI-${cliente.id_cliente}`,
      },
      token
    ).catch((error) => {
      console.error('Erro ao disparar email de boas-vindas:', error)
    })

    return cliente
  }
}

