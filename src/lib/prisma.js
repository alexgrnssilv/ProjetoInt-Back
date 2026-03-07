// Gerenciador de conexão com o banco de dados via Prisma ORM
// Este arquivo exporta uma única instância do PrismaClient (padrão Singleton)
// para evitar criar múltiplas conexões ao banco desnecessariamente

const { PrismaClient } = require('@prisma/client')

// Singleton: reutiliza a mesma instância em toda a aplicação
const prisma = new PrismaClient()

module.exports = prisma
