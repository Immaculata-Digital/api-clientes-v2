import { AppError } from '../../../../core/errors/AppError'
import type { IClienteRepository } from '../../repositories/IClienteRepository'

export class DeleteClienteUseCase {
  constructor(private readonly clienteRepository: IClienteRepository) {}

  async execute(schemaName: string, id: number) {
    const deleted = await this.clienteRepository.delete(schemaName, id)

    if (!deleted) {
      throw new AppError('Cliente não encontrado', 404)
    }
  }
}

