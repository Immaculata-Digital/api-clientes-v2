import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../../../core/errors/AppError'
import { clienteRepository } from '../repositories'
import { CreateClienteUseCase } from '../useCases/createCliente/CreateClienteUseCase'
import { DeleteClienteUseCase } from '../useCases/deleteCliente/DeleteClienteUseCase'
import { GetClienteUseCase } from '../useCases/getCliente/GetClienteUseCase'
import { ListClientesUseCase } from '../useCases/listClientes/ListClientesUseCase'
import { UpdateClienteUseCase } from '../useCases/updateCliente/UpdateClienteUseCase'
import { createClienteSchema, updateClienteSchema } from '../validators/cliente.schema'

export class ClienteController {
  private readonly listClientes: ListClientesUseCase
  private readonly getCliente: GetClienteUseCase
  private readonly createCliente: CreateClienteUseCase
  private readonly updateCliente: UpdateClienteUseCase
  private readonly deleteCliente: DeleteClienteUseCase

  constructor() {
    this.listClientes = new ListClientesUseCase(clienteRepository)
    this.getCliente = new GetClienteUseCase(clienteRepository)
    this.createCliente = new CreateClienteUseCase(clienteRepository)
    this.updateCliente = new UpdateClienteUseCase(clienteRepository)
    this.deleteCliente = new DeleteClienteUseCase(clienteRepository)
  }

  index = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const limit = Math.min(Number(req.query.limit || 10), 100)
      const offset = Number(req.query.offset || 0)
      const search = typeof req.query.search === 'string' ? req.query.search : undefined
      const idLoja = req.query.id_loja ? Number(req.query.id_loja) : undefined

      const result = await this.listClientes.execute(schema, { limit, offset, search, idLoja })
      return res.json({
        data: result.rows,
        pagination: {
          total: result.count,
          page: Math.floor(offset / limit) + 1,
          limit,
          totalPages: Math.ceil(result.count / limit),
        },
      })
    } catch (error) {
      return next(error)
    }
  }

  show = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const id = Number(req.params.id)
      const cliente = await this.getCliente.execute(schema, id)
      return res.json(cliente)
    } catch (error) {
      return next(error)
    }
  }

  store = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const parseResult = createClienteSchema.safeParse(req.body)
      if (!parseResult.success) {
        throw new AppError('Falha de validação', 422, parseResult.error.flatten())
      }

      const token = req.headers.authorization

      const cliente = await this.createCliente.execute(schema, parseResult.data, token)
      return res.status(201).json(cliente)
    } catch (error) {
      return next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const id = Number(req.params.id)
      const parseResult = updateClienteSchema.safeParse(req.body)
      if (!parseResult.success) {
        throw new AppError('Falha de validação', 422, parseResult.error.flatten())
      }

      const userId = req.user?.userId ? parseInt(req.user.userId, 10) : 1

      const cliente = await this.updateCliente.execute(schema, id, parseResult.data, userId)
      return res.json(cliente)
    } catch (error) {
      return next(error)
    }
  }

  destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = req.schema!
      const id = Number(req.params.id)
      await this.deleteCliente.execute(schema, id)
      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  }
}

export const clienteController = new ClienteController()

