# ---------- STAGE 1: BUILD ----------
FROM node:18 AS builder
WORKDIR /app

# Manifestos (cache)
COPY package*.json ./

RUN npm ci

# Código e build
COPY . .
RUN npm run build

# ---------- STAGE 2: RUNTIME ----------
FROM node:18
WORKDIR /app

# Variáveis de ambiente serão passadas via -e no docker run (melhor prática para segredos)
ENV PORT=""
ENV APP_WEB_URL=""
ENV DB_HOST=""
ENV DB_PORT=""
ENV DB_NAME=""
ENV DB_USER=""
ENV DB_PASS=""
ENV JWT_SECRET=""
ENV JWT_EXPIRES_IN=""
ENV API_USUARIOS_URL=""
ENV API_COMUNICACOES_URL=""

# Prod deps
COPY package*.json ./
RUN npm ci --omit=dev

# Artefatos de build
COPY --from=builder /app/dist ./dist

EXPOSE 3335
CMD ["npm", "start"]

