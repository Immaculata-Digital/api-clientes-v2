import type { IClienteRepository } from '../../repositories/IClienteRepository'

export interface ListClientesFilters {
  limit?: number
  offset?: number
  search?: string
  idLoja?: number | number[]
}

export class ListClientesUseCase {
  constructor(private readonly clienteRepository: IClienteRepository) {}

  async execute(schemaName: string, filters: ListClientesFilters = {}) {
    const { limit = 10, offset = 0, search, idLoja } = filters
    const params: { limit: number; offset: number; search?: string; idLoja?: number | number[] } = { limit, offset }
    if (search !== undefined) params.search = search
    if (idLoja !== undefined) params.idLoja = idLoja
    return this.clienteRepository.findAll(schemaName, params)
  }
}

