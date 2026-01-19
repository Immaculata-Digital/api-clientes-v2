export interface UpdateClienteDTO {
  id_loja?: number
  nome_completo?: string
  email?: string
  whatsapp?: string
  cep?: string
  sexo?: 'M' | 'F'
  data_nascimento?: string
  saldo?: number
  aceite_termos?: boolean
}

