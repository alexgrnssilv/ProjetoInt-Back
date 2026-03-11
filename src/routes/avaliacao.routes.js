const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const { verificarToken } = require('../middleware/authMiddleware')

router.use(verificarToken)

// GET /avaliacoes/competencias - Listar competências ativas (para todos os perfis)
router.get('/competencias', async (req, res) => {
    try {
        const competencias = await prisma.competencia.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' }
        })
        res.json(competencias)
    } catch (e) {
        res.status(500).json({ error: 'Erro ao buscar competências' })
    }
})

// GET /avaliacoes/ciclo-ativo - Buscar ciclo atual (para todos os perfis)
router.get('/ciclo-ativo', async (req, res) => {
    try {
        const agora = new Date();
        // Prioriza ciclo cuja data de hoje está dentro do range
        let ciclo = await prisma.cicloAvaliacao.findFirst({
            where: {
                fechado: false,
                dataInicio: { lte: agora },
                dataFim: { gte: agora }
            },
            orderBy: { dataInicio: 'desc' }
        });
        // Fallback: se nenhum ciclo bate com a data, pega o mais recente não fechado
        if (!ciclo) {
            ciclo = await prisma.cicloAvaliacao.findFirst({
                where: { fechado: false },
                orderBy: { dataInicio: 'desc' }
            });
        }
        res.json(ciclo)
    } catch (e) {
        res.status(500).json({ error: 'Erro ao buscar ciclo ativo' })
    }
})

// GET /avaliacoes/pendentes - Retorna colegas de equipe que ainda não foram avaliados e se falta autoavaliação
router.get('/pendentes', async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const agora = new Date();
        let cicloAtivo = await prisma.cicloAvaliacao.findFirst({
            where: { fechado: false, dataInicio: { lte: agora }, dataFim: { gte: agora } },
            orderBy: { dataInicio: 'desc' }
        });
        if (!cicloAtivo) {
            cicloAtivo = await prisma.cicloAvaliacao.findFirst({ where: { fechado: false }, orderBy: { dataInicio: 'desc' } });
        }
        if (!cicloAtivo) {
            return res.json({ pendentes: 0, colegasPendentes: [], autoAvaliacaoPendente: false, cicloId: null });
        }

        // 1. Verificar se falta autoavaliação
        const autoAvaliacao = await prisma.avaliacao.findFirst({
            where: { avaliadorId: usuarioId, avaliadoId: usuarioId, cicloId: cicloAtivo.id, tipo: 'AUTO' }
        });

        // 2. Buscar colegas de equipe
        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            include: { equipe: { include: { usuarios: { select: { id: true, nome: true, cargo: true, ativo: true } } } } }
        });

        if (!usuario.equipeId || !usuario.equipe) {
            return res.json({
                pendentes: 0,
                colegasPendentes: [],
                autoAvaliacaoPendente: !autoAvaliacao,
                cicloId: cicloAtivo.id
            });
        }

        const colegas = (usuario.equipe.usuarios || []).filter(u => u.id !== usuarioId && u.ativo);

        // 3. Avaliações 'PAR' já feitas
        const avaliacoesFeitas = await prisma.avaliacao.findMany({
            where: { avaliadorId: usuarioId, cicloId: cicloAtivo.id, tipo: 'PAR' },
            select: { avaliadoId: true },
            distinct: ['avaliadoId']
        });

        const idsAvaliados = new Set(avaliacoesFeitas.map(a => a.avaliadoId));
        const colegasPendentes = colegas.filter(c => !idsAvaliados.has(c.id));

        res.json({
            pendentes: colegasPendentes.length,
            colegasPendentes,
            autoAvaliacaoPendente: !autoAvaliacao,
            cicloId: cicloAtivo.id
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao buscar pendências' });
    }
});

// GET /avaliacoes/relatorio - Consolida dados para Excel/PDF
router.get('/relatorio', async (req, res) => {
    try {
        const avaliacoes = await prisma.avaliacao.findMany({
            include: {
                avaliador: { select: { nome: true } },
                avaliado: { select: { nome: true } },
                competencia: { select: { nome: true } },
                ciclo: { select: { nome: true } }
            }
        });

        const data = avaliacoes.map(av => ({
            ciclo: av.ciclo.nome,
            avaliador: av.anonimo ? 'Anônimo' : av.avaliador.nome,
            avaliado: av.avaliado.nome,
            competencia: av.competencia.nome,
            pontuacao: av.pontuacao,
            nivel: av.nivel,
            tipo: av.tipo,
            observacoes: av.observacoes,
            data: av.criadoEm
        }));
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
});

// Submeter múltiplas avaliações de uma vez
router.post('/', async (req, res) => {
    const { avaliadoId, cicloId, avaliacoes, tipo, anonimo } = req.body // avaliacoes = [{ competenciaId, pontuacao, observacoes }]
    const isAnonimo = anonimo !== undefined ? Boolean(anonimo) : true

    // Validar se estamos recebendo um ciclo e colegas corretos
    if (!avaliadoId || !cicloId || !avaliacoes || !Array.isArray(avaliacoes)) {
        return res.status(400).json({ mensagem: 'Dados inválidos. Verifique se escolheu um colega e se há um ciclo ativo.' });
    }

    try {
        // [NOVO] Validação para impedir múltiplas avaliações do mesmo tipo no mesmo ciclo
        if (tipo === 'AUTO' || tipo === 'PAR') {
            const avaliacaoExistente = await prisma.avaliacao.findFirst({
                where: {
                    avaliadorId: req.usuario.id,
                    avaliadoId: parseInt(avaliadoId),
                    cicloId: parseInt(cicloId),
                    tipo: tipo
                }
            });

            if (avaliacaoExistente) {
                return res.status(400).json({
                    mensagem: `Você já realizou esta ${tipo === 'AUTO' ? 'autoavaliação' : 'avaliação para este colega'} neste ciclo.`
                });
            }
        }

        const result = await prisma.$transaction(
            avaliacoes.map(av => prisma.avaliacao.upsert({
                where: {
                    avaliadorId_avaliadoId_cicloId_competenciaId_tipo: {
                        avaliadorId: req.usuario.id,
                        avaliadoId: parseInt(avaliadoId),
                        cicloId: parseInt(cicloId),
                        competenciaId: parseInt(av.competenciaId),
                        tipo: tipo || 'PAR'
                    }
                },
                update: {
                    pontuacao: parseInt(av.pontuacao),
                    nivel: mapearNivel(av.pontuacao),
                    observacoes: av.observacoes,
                    anonimo: isAnonimo
                },
                create: {
                    avaliadorId: req.usuario.id,
                    avaliadoId: parseInt(avaliadoId),
                    cicloId: parseInt(cicloId),
                    competenciaId: parseInt(av.competenciaId),
                    tipo: tipo || 'PAR',
                    pontuacao: parseInt(av.pontuacao),
                    nivel: mapearNivel(av.pontuacao),
                    observacoes: av.observacoes,
                    anonimo: isAnonimo
                }
            }))
        )
        res.json({ sucesso: true, result })
    } catch (e) {
        console.error("Erro Prisma Detalhado:", e)
        res.status(400).json({ mensagem: 'Erro ao salvar avaliações. Verifique o console.' })
    }
})

function mapearNivel(pontu) {
    const p = parseInt(pontu);
    if (p <= 4) return 'CRITICO'
    if (p <= 6) return 'EM_DESENVOLVIMENTO'
    if (p <= 8) return 'ATINGIU'
    return 'EXCEDEU'
}

module.exports = router
