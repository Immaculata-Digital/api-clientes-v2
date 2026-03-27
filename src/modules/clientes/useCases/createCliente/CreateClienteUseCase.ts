import { AppError } from '../../../../core/errors/AppError'
import type { CreateClienteDTO } from '../../dto/CreateClienteDTO'
import type { IClienteRepository } from '../../repositories/IClienteRepository'
import { usuarioApiService } from '../../services/UsuarioApiService'
import { comunicacoesService } from '../../services/ComunicacoesService'
import axios from 'axios'

export class CreateClienteUseCase {
  constructor(
    private readonly clienteRepository: IClienteRepository,
  ) { }

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
    let idUsuario: string
    try {
      const usuarioResponse = await usuarioApiService.createClienteUsuario(
        {
          login: data.email,
          email: data.email,
          senha: data.senha,
          nome: data.nome_completo,
        },
        schemaName,
        token
      )

      if (!usuarioResponse.id) {
        throw new AppError('ID do usuário não foi retornado pela API de usuários', 500)
      }

      idUsuario = usuarioResponse.id
    } catch (error: any) {
      throw new AppError(`Erro ao criar usuário: ${error.message}`, 500)
    }

    // Buscar lat/long pelo CEP (Prioridade: AwesomeAPI, Fallback: Nominatim)
    let latitude: number | null = null
    let longitude: number | null = null
    const cleanCep = data.cep.replace(/\D/g, '')

    try {
      console.log(`[CreateClienteUseCase] Buscando geolocalização para o CEP ${cleanCep}...`)
      // 1. Tentar AwesomeAPI (Gratuita e precisa para BR)
      const resAwesome = await axios.get(`https://cep.awesomeapi.com.br/json/${cleanCep}`, { timeout: 5000 })
      if (resAwesome.data && resAwesome.data.lat) {
        latitude = Number(resAwesome.data.lat)
        longitude = Number(resAwesome.data.lng)
      } else {
        // 2. Fallback Nominatim
        const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${cleanCep}&country=Brazil&limit=1`
        const geoResponse = await axios.get(geoUrl, {
          headers: { 'User-Agent': 'Concordia/1.0' },
          timeout: 5000
        })
        if (geoResponse.data && geoResponse.data.length > 0) {
          latitude = Number(geoResponse.data[0].lat)
          longitude = Number(geoResponse.data[0].lon)
        }
      }

      if (latitude && longitude) {
        console.log(`[CreateClienteUseCase] Coordenadas obtidas: ${latitude}, ${longitude}`)
      } else {
        console.warn(`[CreateClienteUseCase] Não foi possível obter coordenadas para o CEP ${cleanCep}`)
      }
    } catch (error: any) {
      console.warn(`[CreateClienteUseCase] Erro na busca de geolocalização: ${error.message}`)
    }

    // Criar cliente no banco
    // No cadastro público, o usuário está se cadastrando, então usamos o próprio idUsuario como usu_cadastro
    const cliente = await this.clienteRepository.create(schemaName, {
      ...data,
      id_usuario: idUsuario,
      usu_cadastro: idUsuario, // O próprio cliente está se cadastrando
      latitude: latitude,
      longitude: longitude,
    })

    // Disparar email de boas-vindas (não bloquear se falhar)
    comunicacoesService.dispararBoasVindas(
      schemaName,
      {
        id_cliente: cliente.id_cliente,
        nome_completo: cliente.nome_completo,
        email: cliente.email,
        codigo_cliente: `CLI-${cliente.id_cliente}`,
      },
      token
    ).catch((error) => {
      console.error('Erro ao disparar email de boas-vindas:', error)
    })

    return cliente
  }
}

