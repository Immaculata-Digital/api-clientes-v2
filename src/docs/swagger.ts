import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Clientes Concordia ERP',
      version: '1.0.0',
      description: 'Documentação da API de clientes do Concordia ERP, incluindo gestão de clientes, pontos e movimentações.',
    },
    servers: [
      {
        url: 'http://localhost:7773/api',
        description: 'Servidor de Desenvolvimento Local',
      },
      {
        url: 'https://homolog-api-clientes.immaculatadigital.com.br/api',
        description: 'Servidor de Homologação',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT de acesso (obtido na API de Usuários)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            status: { type: 'string', example: 'error' },
            statusCode: { type: 'number', example: 400 },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/modules/**/*.routes.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)

