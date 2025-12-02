export interface CreateClienteDTO {
  id_loja: number
  nome_completo: string
  email: string
  whatsapp: string
  cep: string
  sexo: 'M' | 'F'
  aceite_termos: boolean
  senha: string
}

