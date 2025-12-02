import { z } from 'zod'

const normalizeEmail = (email: string) => email.toLowerCase().trim()
const normalizeWhatsApp = (whatsapp: string) => whatsapp.replace(/\D/g, '')
const normalizeCEP = (cep: string) => cep.replace(/\D/g, '')

export const createClienteSchema = z.object({
  id_loja: z.number().int().positive('ID da loja deve ser um número positivo'),
  nome_completo: z.string().min(3, 'Nome completo deve ter pelo menos 3 caracteres').max(255),
  email: z.string().email('Email inválido').transform(normalizeEmail),
  whatsapp: z.string().min(10, 'WhatsApp inválido').transform(normalizeWhatsApp),
  cep: z.string().min(8, 'CEP inválido').max(8).transform(normalizeCEP),
  sexo: z.enum(['M', 'F'], { errorMap: () => ({ message: 'Sexo deve ser M ou F' }) }),
  aceite_termos: z.boolean().refine((val) => val === true, { message: 'É necessário aceitar os termos' }),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

export const updateClienteSchema = z.object({
  id_loja: z.number().int().positive().optional(),
  nome_completo: z.string().min(3).max(255).optional(),
  email: z.string().email().transform(normalizeEmail).optional(),
  whatsapp: z.string().min(10).transform(normalizeWhatsApp).optional(),
  cep: z.string().min(8).max(8).transform(normalizeCEP).optional(),
  sexo: z.enum(['M', 'F']).optional(),
  saldo: z.number().int().optional(),
  aceite_termos: z.boolean().optional(),
})

