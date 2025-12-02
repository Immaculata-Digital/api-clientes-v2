import type { ClienteProps, CreateClienteProps, UpdateClienteProps } from '../entities/Cliente'

export interface IClienteRepository {
  findAll(schemaName: string, filters: { limit: number; offset: number; search?: string; idLoja?: number }): Promise<{ rows: ClienteProps[]; count: number }>
  findById(schemaName: string, id: number): Promise<ClienteProps | null>
  findByEmail(schemaName: string, email: string): Promise<ClienteProps | null>
  findByWhatsApp(schemaName: string, whatsapp: string): Promise<ClienteProps | null>
  findByIdUsuario(schemaName: string, idUsuario: number): Promise<ClienteProps | null>
  create(schemaName: string, data: CreateClienteProps): Promise<ClienteProps>
  update(schemaName: string, id: number, data: UpdateClienteProps): Promise<ClienteProps | null>
  delete(schemaName: string, id: number): Promise<boolean>
}

