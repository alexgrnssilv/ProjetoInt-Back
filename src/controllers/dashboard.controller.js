// =====================================================
// dashboard.controller.js — Controller do Dashboard
// Rota principal: GET /api/dashboard/stats
// =====================================================

const prisma = require('../lib/prisma')

/**
 * Mapeia a pontuação média para a cor hexadecimal do nível
 * Regra de negócio: 4 níveis padronizados obrigatórios
 *
 * @param {number} media - Média das pontuações (1.0 a 4.0)
 * @returns {{ nivel: string, cor: string }}
 */
const mapearNivelECor = (media) => {
    if (media <= 4) return { nivel: 'Crítico', cor: '#EF4444' }             // Vermelho
    if (media <= 6) return { nivel: 'Em Desenvolvimento', cor: '#EAB308' }   // Amarelo
    if (media <= 8) return { nivel: 'Atingiu', cor: '#22C55E' }             // Verde
    return { nivel: 'Excedeu', cor: '#3B82F6' }                              // Azul
}

/**
 * GET /api/dashboard/stats
 * Retorna o consolidado de médias de soft skills por colaborador com RANKING funcional.
 */
const getDashboardStats = async (req, res) => {
    const { equipeId, cicloId } = req.query

    try {
        const filtroUsuario = { ativo: true, papel: 'COLABORADOR' }
        if (equipeId) filtroUsuario.equipeId = parseInt(equipeId)

        // 1. Buscar todos os usuários
        const usuarios = await prisma.usuario.findMany({
            where: filtroUsuario,
            select: { id: true, nome: true, cargo: true, equipe: { select: { nome: true } } }
        })

        if (usuarios.length === 0) {
            return res.status(200).json({ sucesso: true, dados: { resumo: { totalColaboradores: 0, mediaGlobal: 0 }, colaboradores: [] } })
        }

        const mapColaboradores = new Map()
        usuarios.forEach(u => {
            mapColaboradores.set(u.id, {
                colaborador: u,
                pontuacoes: { AUTO: [], LIDER: [], PAR: [] },
                competencias: new Map()
            })
        })

        const filtroAvaliacao = {}
        if (cicloId) filtroAvaliacao.cicloId = parseInt(cicloId)
        if (equipeId) filtroAvaliacao.avaliado = { equipeId: parseInt(equipeId) }

        // 2. Buscar avaliações
        const avaliacoes = await prisma.avaliacao.findMany({
            where: filtroAvaliacao,
            include: {
                competencia: { select: { id: true, nome: true } }
            },
        })

        for (const av of avaliacoes) {
            if (mapColaboradores.has(av.avaliadoId)) {
                const dadosColab = mapColaboradores.get(av.avaliadoId)
                dadosColab.pontuacoes[av.tipo].push(av.pontuacao)

                if (!dadosColab.competencias.has(av.competenciaId)) {
                    dadosColab.competencias.set(av.competenciaId, { nome: av.competencia.nome, AUTO: [], LIDER: [], PAR: [] })
                }
                dadosColab.competencias.get(av.competenciaId)[av.tipo].push(av.pontuacao)
            }
        }

        const colaboradores = []
        for (const [id, dados] of mapColaboradores) {
            // Cálculo do Ranking Funcional (Peso: Lider 50%, Pares 40%, Auto 10%)
            const calcMedia = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null

            const mediaLider = calcMedia(dados.pontuacoes.LIDER)
            const mediaPares = calcMedia(dados.pontuacoes.PAR)
            const mediaAuto = calcMedia(dados.pontuacoes.AUTO)

            let mediaFinal = 0
            let pesoTotal = 0

            if (mediaLider !== null) { mediaFinal += mediaLider * 0.5; pesoTotal += 0.5 }
            if (mediaPares !== null) { mediaFinal += mediaPares * 0.4; pesoTotal += 0.4 }
            if (mediaAuto !== null) { mediaFinal += mediaAuto * 0.1; pesoTotal += 0.1 }

            const scoreFinal = pesoTotal > 0 ? mediaFinal / pesoTotal : null;
            const { nivel, cor } = scoreFinal !== null ? mapearNivelECor(scoreFinal) : { nivel: 'Pendente', cor: '#94a3b8' }; // slate-400

            // Gera dados do radar com TODAS as competências avaliadas
            const radarData = []
            for (const [compId, comp] of dados.competencias) {
                const todasNotas = [...comp.AUTO, ...comp.LIDER, ...comp.PAR]
                const mediaNota = todasNotas.length > 0 ? todasNotas.reduce((a, b) => a + b, 0) / todasNotas.length : 0
                radarData.push({ competencia: comp.nome, nota: Math.round(mediaNota * 100) / 100 })
            }

            colaboradores.push({
                ...dados.colaborador,
                mediaGeral: scoreFinal !== null ? Math.round(scoreFinal * 100) / 100 : 0,
                nivelGeral: nivel,
                corGeral: cor,
                autoAvaliacao: mediaAuto !== null ? Math.round(mediaAuto * 100) / 100 : null,
                radarData
            })
        }

        // Ordenação para o RANKING (menores/zerados no final)
        colaboradores.sort((a, b) => b.mediaGeral - a.mediaGeral)

        const cicloAtivoQuery = await prisma.cicloAvaliacao.findFirst({
            where: { fechado: false },
            orderBy: { id: 'desc' }
        })
        const cicloAtivoNome = cicloAtivoQuery ? cicloAtivoQuery.nome : 'Nenhum Ciclo';

        return res.status(200).json({
            sucesso: true,
            dados: {
                resumo: {
                    totalColaboradores: colaboradores.length,
                    mediaGlobal: Math.round((colaboradores.reduce((a, b) => a + b.mediaGeral, 0) / (colaboradores.filter(c => c.mediaGeral > 0).length || 1)) * 100) / 100,
                    cicloAtivo: cicloAtivoNome
                },
                colaboradores
            }
        })
    } catch (erro) {
        console.error('[Dashboard] Erro stats:', erro)
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao processar ranking.' })
    }
}

/**
 * GET /api/dashboard/colaborador/:id
 * Retorna visão 360° para o Radar Chart (Comparação)
 */
const getPerfilColaborador = async (req, res) => {
    const { id } = req.params
    const { cicloId } = req.query

    try {
        const [usuario, avaliacoes] = await Promise.all([
            prisma.usuario.findUnique({
                where: { id: parseInt(id) },
                select: { id: true, nome: true, cargo: true, equipe: { select: { nome: true } } }
            }),
            prisma.avaliacao.findMany({
                where: { avaliadoId: parseInt(id), ...(cicloId && { cicloId: parseInt(cicloId) }) },
                include: { competencia: true }
            })
        ])

        if (!usuario) return res.status(404).json({ sucesso: false, mensagem: 'Não encontrado.' })

        const compMap = new Map()
        avaliacoes.forEach(av => {
            if (!compMap.has(av.competenciaId)) {
                compMap.set(av.competenciaId, { nome: av.competencia.nome, AUTO: [], LIDER: [], PAR: [] })
            }
            compMap.get(av.competenciaId)[av.tipo].push(av.pontuacao)
        })

        const radarData = Array.from(compMap.values()).map(c => {
            const todasNotas = [...c.AUTO, ...c.LIDER, ...c.PAR]
            const mediaNota = todasNotas.length > 0 ? todasNotas.reduce((a, b) => a + b, 0) / todasNotas.length : 0
            return {
                competencia: c.nome,
                nota: Math.round(mediaNota * 100) / 100,
                auto: c.AUTO.length > 0 ? Math.round((c.AUTO.reduce((a, b) => a + b, 0) / c.AUTO.length) * 100) / 100 : null,
                lider: c.LIDER.length > 0 ? Math.round((c.LIDER.reduce((a, b) => a + b, 0) / c.LIDER.length) * 100) / 100 : null,
                pares: c.PAR.length > 0 ? Math.round((c.PAR.reduce((a, b) => a + b, 0) / c.PAR.length) * 100) / 100 : null
            }
        })

        return res.status(200).json({ sucesso: true, colaborador: usuario, radarData })
    } catch (erro) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar perfil.' })
    }
}

module.exports = { getDashboardStats, getPerfilColaborador }
