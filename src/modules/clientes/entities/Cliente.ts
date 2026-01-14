export interface ClienteProps {
  id_cliente: number
  id_usuario: string // UUID da API de usuários
  id_loja: number
  nome_completo: string
  email: string
  whatsapp: string
  cep: string
  sexo: 'M' | 'F'
  saldo: number
  aceite_termos: boolean
  dt_cadastro: Date
  usu_cadastro: string // UUID do usuário que cadastrou
  dt_altera?: Date | null
  usu_altera?: string | null // UUID do usuário que alterou
}

export type CreateClienteProps = Omit<ClienteProps, 'id_cliente' | 'dt_cadastro' | 'dt_altera' | 'usu_altera' | 'saldo'> & {
  senha: string // Para criar o usuário na API de usuários
}

export type UpdateClienteProps = Partial<Omit<ClienteProps, 'id_cliente' | 'id_usuario' | 'dt_cadastro' | 'usu_cadastro'>> & {
  usu_altera: string // UUID do usuário que alterou
}

export class Cliente {
  private constructor(private props: ClienteProps) {}

  static create(data: CreateClienteProps): Cliente {
    const timestamp = new Date()
    return new Cliente({
      ...data,
      id_cliente: 0, // Será definido pelo banco
      saldo: 0,
      dt_cadastro: timestamp,
      dt_altera: null,
      usu_altera: null,
    })
  }

  static restore(props: ClienteProps): Cliente {
    return new Cliente(props)
  }

  update(data: UpdateClienteProps) {
    const nextProps: ClienteProps = { ...this.props }

    if (typeof data.id_loja !== 'undefined') {
      nextProps.id_loja = data.id_loja
    }
    if (typeof data.nome_completo !== 'undefined') {
      nextProps.nome_completo = data.nome_completo
    }
    if (typeof data.email !== 'undefined') {
      nextProps.email = data.email
    }
    if (typeof data.whatsapp !== 'undefined') {
      nextProps.whatsapp = data.whatsapp
    }
    if (typeof data.cep !== 'undefined') {
      nextProps.cep = data.cep
    }
    if (typeof data.sexo !== 'undefined') {
      nextProps.sexo = data.sexo
    }
    if (typeof data.saldo !== 'undefined') {
      nextProps.saldo = data.saldo
    }
    if (typeof data.aceite_termos !== 'undefined') {
      nextProps.aceite_termos = data.aceite_termos
    }

    nextProps.usu_altera = data.usu_altera
    nextProps.dt_altera = new Date()

    this.props = nextProps
  }

  toJSON(): ClienteProps {
    return { ...this.props }
  }
}

