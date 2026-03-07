// =====================================================
// dashboard.routes.js — Rotas do Dashboard
// =====================================================

const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const { getDashboardStats, getPerfilColaborador } = require('../controllers/dashboard.controller')
const { verificarToken } = require('../middleware/authMiddleware')
const { requireRole, requireOwnerOrAdmin } = require('../middleware/roleMiddleware')

// GET /api/dashboard/stats — Apenas Admins
// Retorna consolidado de médias por equipe/ciclo com cores
router.get('/stats', verificarToken, requireRole('ADMIN'), getDashboardStats)

// GET /api/dashboard/colaborador/:id — Admin ou o próprio colaborador
// Anonimato garantido: avaliadorId nunca retorna ao frontend
router.get('/colaborador/:id', verificarToken, requireOwnerOrAdmin('id'), getPerfilColaborador)

// GET /api/dashboard/equipe — Membros da equipe do colaborador
router.get('/equipe', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            include: { equipe: { include: { usuarios: { select: { id: true, nome: true, cargo: true, ativo: true } } } } }
        });

        if (!usuario.equipeId || !usuario.equipe) {
            return res.json([]);
        }
        const colegas = usuario.equipe.usuarios.filter(u => u.id !== usuarioId && u.ativo);
        res.json(colegas);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao buscar equipe.' });
    }
});

module.exports = router
