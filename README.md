# API Clientes v2

API REST para gerenciamento de clientes, pontos e movimentações seguindo arquitetura SOLID/MVC.

## 🚀 Características

- ✅ **Arquitetura SOLID/MVC** - Separação de responsabilidades
- ✅ **Multi-tenant por schema** - Cada cliente tem seu próprio namespace
- ✅ **Autenticação JWT** - Validação via API de Usuários
- ✅ **Validação com Zod** - Schemas de validação robustos
- ✅ **Documentação Swagger** - API totalmente documentada
- ✅ **TypeScript** - Tipagem estática completa

## 📋 Pré-requisitos

- Node.js 20+
- PostgreSQL
- npm ou yarn

## 🛠️ Instalação

1. **Instale as dependências:**
```bash
npm install
```

2. **Configure o arquivo `.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=immaculata-v2
DB_USER=developer
DB_PASS=password
PORT=7773
API_USUARIOS_URL=http://localhost:3333/api
```

3. **Execute em desenvolvimento:**
```bash
npm run dev
```

4. **Para produção:**
```bash
npm run build
npm start
```

## 📚 Endpoints

A documentação completa está disponível em `/docs` quando o servidor estiver rodando.

