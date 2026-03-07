// =====================================================
// server.js — Ponto de Entrada da API SENAI-CIC
// =====================================================

// Carrega as variáveis do .env PRIMEIRO (antes de qualquer import que precise delas)
require('dotenv').config()

const express = require('express')
const cors = require('cors')

// Importa os roteadores de cada domínio
const authRoutes = require('./routes/auth.routes')
const dashboardRoutes = require('./routes/dashboard.routes')
const adminRoutes = require('./routes/admin.routes')
const avaliacaoRoutes = require('./routes/avaliacao.routes')

const app = express()
const PORTA = process.env.PORT || 3001

// ---- MIDDLEWARES GLOBAIS ----

// CORS: permite localhost e a URL de produção do frontend (configurada no ambiente)
const origensPermitidas = ['http://localhost:5173', 'http://localhost:3000'];
if (process.env.FRONTEND_URL) {
    origensPermitidas.push(process.env.FRONTEND_URL);
}
const bcrypt = require('bcrypt')

app.get('/criar-admin', async (req, res) => {

  const senhaHash = await bcrypt.hash("senha123", 10)

  const prisma = require('./prisma') // ou onde você importa o prisma

  const usuario = await prisma.usuario.create({
    data: {
      nome: "Admin",
      email: "admin@senai.br",
      senhaHash: senhaHash,
      cargo: "Coordenador",
      papel: "ADMIN",
      equipeId: 1,
      ativo: true
    }
  })

  res.json(usuario)
})


app.use(cors({
    origin: true,
    credentials: true,
}))

// Faz o Express interpretar o corpo das requisições como JSON
app.use(express.json())

// Log simples de requisições para facilitar o debug durante desenvolvimento
app.use((req, _res, next) => {
    console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${req.method} ${req.path}`)
    next()
})

// ---- ROTAS ----
// Prefixo /api para separar a API de outros recursos futuros
app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/avaliacoes', avaliacaoRoutes)

// Rota de verificação de saúde da API (health check)
app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', mensagem: 'API SENAI-CIC funcionando!', timestamp: new Date().toISOString() })
})

// ---- HANDLER DE ROTAS NÃO ENCONTRADAS ----
app.use((_req, res) => {
    res.status(404).json({ sucesso: false, mensagem: 'Rota não encontrada.' })
})

// ---- HANDLER GLOBAL DE ERROS ----
// Captura erros não tratados nos controllers
app.use((err, _req, res, _next) => {
    console.error('[Erro Global]', err.stack)
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno inesperado.' })
})

// ---- INICIALIZA O SERVIDOR ----
app.listen(PORTA, () => {
    console.log(`\n🚀 API SENAI-CIC rodando em http://localhost:${PORTA}`)
    console.log(`📊 Health check: http://localhost:${PORTA}/api/health\n`)
})

module.exports = app
