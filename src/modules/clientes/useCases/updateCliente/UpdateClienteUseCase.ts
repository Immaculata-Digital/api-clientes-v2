import { AppError } from '../../../../core/errors/AppError'
import type { UpdateClienteDTO } from '../../dto/UpdateClienteDTO'
import type { IClienteRepository } from '../../repositories/IClienteRepository'

export class UpdateClienteUseCase {
  constructor(private readonly clienteRepository: IClienteRepository) {}

  async execute(schemaName: string, id: number, data: UpdateClienteDTO, userId: number) {
    // Verificar se email ou WhatsApp já estão em uso por outro cliente
    if (data.email) {
      const existingByEmail = await this.clienteRepository.findByEmail(schemaName, data.email)
      if (existingByEmail && existingByEmail.id_cliente !== id) {
        throw new AppError('Email já cadastrado por outro cliente', 409)
      }
    }

    if (data.whatsapp) {
      const existingByWhatsApp = await this.clienteRepository.findByWhatsApp(schemaName, data.whatsapp)
      if (existingByWhatsApp && existingByWhatsApp.id_cliente !== id) {
        throw new AppError('WhatsApp já cadastrado por outro cliente', 409)
      }
    }

    const updatedCliente = await this.clienteRepository.update(schemaName, id, {
      ...data,
      usu_altera: userId,
    })

    if (!updatedCliente) {
      throw new AppError('Cliente não encontrado', 404)
    }

    return updatedCliente
  }
}

