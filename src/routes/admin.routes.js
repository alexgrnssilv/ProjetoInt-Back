const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const { verificarToken } = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/roleMiddleware')
const bcrypt = require('bcryptjs')

router.use(verificarToken)
router.use(requireRole('ADMIN'))

// Gerenciar Usuários
router.get('/usuarios', async (req, res) => {
    const users = await prisma.usuario.findMany({
        include: { equipe: true },
        orderBy: { nome: 'asc' }
    })
    res.json(users)
})

router.post('/usuarios', async (req, res) => {
    const { nome, email, senha, cargo, papel, equipeId } = req.body
    const senhaHash = await bcrypt.hash(senha, 10)
    try {
        const user = await prisma.usuario.create({
            data: { nome, email, senhaHash, cargo, papel, equipeId: equipeId ? parseInt(equipeId) : null }
        })
        res.status(201).json(user)
    } catch (e) {
        res.status(400).json({ mensagem: 'Erro ao criar usuário.' })
    }
})

router.put('/usuarios/:id', async (req, res) => {
    const { id } = req.params
    const { nome, email, cargo, papel, equipeId, ativo } = req.body
    try {
        const user = await prisma.usuario.update({
            where: { id: parseInt(id) },
            data: { nome, email, cargo, papel, equipeId: equipeId ? parseInt(equipeId) : null, ativo }
        })
        res.json(user)
    } catch (e) {
        res.status(400).json({ mensagem: 'Erro ao atualizar.' })
    }
})

router.delete('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const userId = parseInt(id);
    console.log('[DEBUG] DELETE /admin/usuarios/' + userId);
    try {
        // Exclusão em cascata: remove avaliações vinculadas ao usuário
        await prisma.avaliacao.deleteMany({
            where: { OR: [{ avaliadorId: userId }, { avaliadoId: userId }] }
        });
        await prisma.usuario.delete({
            where: { id: userId }
        });
        console.log('[DEBUG] Usuário', userId, 'deletado com sucesso');
        res.json({ mensagem: 'Usuário deletado com sucesso.' });
    } catch (e) {
        console.error('[DEBUG] Erro ao deletar usuário:', e);
        if (e.code === 'P2003') {
            return res.status(400).json({ mensagem: 'Não é possível excluir este usuário pois ele possui registros vinculados em outras tabelas.' });
        }
        res.status(400).json({ mensagem: 'Erro ao deletar usuário: ' + (e.meta?.cause || e.message) });
    }
});

// Gerenciar Equipes
router.get('/equipes', async (req, res) => {
    const equipes = await prisma.equipe.findMany({ include: { _count: { select: { usuarios: true } } } })
    res.json(equipes)
})

router.post('/equipes', async (req, res) => {
    const { nome, descricao } = req.body
    try {
        const equipe = await prisma.equipe.create({ data: { nome, descricao } })
        res.status(201).json(equipe)
    } catch (e) {
        res.status(400).json({ mensagem: 'Erro ao criar equipe.' })
    }
})

// Gerenciar Ciclos
router.get('/ciclos', async (req, res) => {
    const ciclos = await prisma.cicloAvaliacao.findMany({ orderBy: { dataInicio: 'desc' } })
    res.json(ciclos)
})

router.post('/ciclos', async (req, res) => {
    const { nome, dataInicio, dataFim, tipoPeriodo } = req.body
    try {
        const ciclo = await prisma.cicloAvaliacao.create({
            data: { nome, dataInicio: new Date(dataInicio), dataFim: new Date(dataFim), tipoPeriodo }
        })
        res.status(201).json(ciclo)
    } catch (e) {
        res.status(400).json({ mensagem: 'Erro ao criar ciclo.' })
    }
})

router.put('/ciclos/:id', async (req, res) => {
    const { id } = req.params
    const { nome, dataInicio, dataFim, tipoPeriodo, fechado } = req.body
    try {
        // Constrói o payload de atualização dinamicamente para suportar atualizações parciais
        const updateData = {}
        if (nome !== undefined) updateData.nome = nome
        if (dataInicio !== undefined) updateData.dataInicio = new Date(dataInicio)
        if (dataFim !== undefined) updateData.dataFim = new Date(dataFim)
        if (tipoPeriodo !== undefined) updateData.tipoPeriodo = tipoPeriodo
        if (fechado !== undefined) updateData.fechado = fechado

        const ciclo = await prisma.cicloAvaliacao.update({
            where: { id: parseInt(id) },
            data: updateData
        })
        res.json(ciclo)
    } catch (e) {
        console.error('Erro ao atualizar ciclo:', e)
        res.status(400).json({ mensagem: 'Erro ao atualizar ciclo.' })
    }
})

router.delete('/ciclos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Exclusão manual em cascata para não dar erro P2003 de Foreign Key
        await prisma.avaliacao.deleteMany({
            where: { cicloId: parseInt(id) }
        });
        await prisma.cicloAvaliacao.delete({
            where: { id: parseInt(id) }
        });
        res.json({ mensagem: 'Ciclo deletado com sucesso.' });
    } catch (e) {
        console.error('Erro ao deletar ciclo:', e);
        // P2003: Foreign key constraint failed
        if (e.code === 'P2003') {
            return res.status(400).json({ mensagem: 'Não é possível excluir este ciclo pois ele possui registros vinculados.' });
        }
        res.status(400).json({ mensagem: 'Erro ao deletar ciclo: ' + (e.meta?.cause || e.message) });
    }
});

// Listar competências ativas
router.get('/competencias', async (req, res) => {
    try {
        const competencias = await prisma.competencia.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' }
        })
        res.json(competencias)
    } catch (e) {
        console.error(e)
        res.status(500).json({ mensagem: 'Erro ao buscar competências.' })
    }
})

// Buscar ciclo ativo (baseado na data vigente)
router.get('/ciclo-ativo', async (req, res) => {
    try {
        const agora = new Date();
        let ciclo = await prisma.cicloAvaliacao.findFirst({
            where: {
                fechado: false,
                dataInicio: { lte: agora },
                dataFim: { gte: agora }
            },
            orderBy: { dataInicio: 'desc' }
        });
        if (!ciclo) {
            ciclo = await prisma.cicloAvaliacao.findFirst({
                where: { fechado: false },
                orderBy: { dataInicio: 'desc' }
            });
        }
        res.json(ciclo)
    } catch (e) {
        console.error(e)
        res.status(500).json({ mensagem: 'Erro ao buscar ciclo ativo.' })
    }
})

module.exports = router
