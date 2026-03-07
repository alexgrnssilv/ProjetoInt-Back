// =====================================================
// auth.routes.js — Rotas de Autenticação
// =====================================================

const express = require('express')
const router = express.Router()
const { login, registrar, perfil } = require('../controllers/auth.controller')
const { verificarToken } = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/roleMiddleware')

// POST /api/auth/login — Público (não requer token)
router.post('/login', login)

// POST /api/auth/registrar — Restrito a Admins
router.post('/registrar', verificarToken, requireRole('ADMIN'), registrar)

// GET /api/auth/perfil — Requer autenticação
router.get('/perfil', verificarToken, perfil)

module.exports = router
