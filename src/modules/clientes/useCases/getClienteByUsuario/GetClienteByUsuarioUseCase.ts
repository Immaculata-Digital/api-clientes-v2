import { AppError } from '../../../../core/errors/AppError'
import type { IClienteRepository } from '../../repositories/IClienteRepository'

export class GetClienteByUsuarioUseCase {
  constructor(private readonly clienteRepository: IClienteRepository) {}

  async execute(schemaName: string, idUsuario: string) {
    const cliente = await this.clienteRepository.findByIdUsuario(schemaName, idUsuario)

    if (!cliente) {
      throw new AppError('Cliente não encontrado para este usuário', 404)
    }

    return cliente
  }
}

