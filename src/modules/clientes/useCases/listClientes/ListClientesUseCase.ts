import type { IClienteRepository } from '../../repositories/IClienteRepository'

export interface ListClientesFilters {
  limit?: number
  offset?: number
  search?: string
  idLoja?: number
}

export class ListClientesUseCase {
  constructor(private readonly clienteRepository: IClienteRepository) {}

  async execute(schemaName: string, filters: ListClientesFilters = {}) {
    const { limit = 10, offset = 0, search, idLoja } = filters
    return this.clienteRepository.findAll(schemaName, { limit, offset, search, idLoja })
  }
}

