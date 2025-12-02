import { AppError } from '../../../../core/errors/AppError'
import type { IClienteRepository } from '../../repositories/IClienteRepository'

export class GetClienteUseCase {
  constructor(private readonly clienteRepository: IClienteRepository) {}

  async execute(schemaName: string, id: number) {
    const cliente = await this.clienteRepository.findById(schemaName, id)

    if (!cliente) {
      throw new AppError('Cliente não encontrado', 404)
    }

    return cliente
  }
}

