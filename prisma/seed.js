// =====================================================
// seed.js — Dados iniciais para desenvolvimento/testes
// Execute com: npm run prisma:seed
// =====================================================

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Iniciando seed do banco de dados...')

    // --- 1. CRIAR EQUIPES ---
    const equipeDesenv = await prisma.equipe.upsert({
        where: { nome: 'Desenvolvimento de Software' },
        update: {},
        create: { nome: 'Desenvolvimento de Software', descricao: 'Equipe de instrutores de programação' },
    })

    const equipeGestao = await prisma.equipe.upsert({
        where: { nome: 'Gestão e Negócios' },
        update: {},
        create: { nome: 'Gestão e Negócios', descricao: 'Equipe de gestão e empreendedorismo' },
    })

    console.log('✅ Equipes criadas')

    // --- 2. CRIAR USUÁRIOS ---
    // Hash das senhas com bcrypt (custo 10 = boa segurança sem ser lento)
    const senhaHash = await bcrypt.hash('senha123', 10)

    const admin = await prisma.usuario.upsert({
        where: { email: 'admin@senai.br' },
        update: {},
        create: {
            nome: 'Administrador SENAI',
            email: 'admin@senai.br',
            senhaHash,
            cargo: 'Coordenador',
            papel: 'ADMIN',
            equipeId: equipeDesenv.id,
        },
    })

    const colaborador1 = await prisma.usuario.upsert({
        where: { email: 'joao.silva@senai.br' },
        update: {},
        create: {
            nome: 'João Silva',
            email: 'joao.silva@senai.br',
            senhaHash,
            cargo: 'Instrutor',
            papel: 'COLABORADOR',
            equipeId: equipeDesenv.id,
        },
    })

    const colaborador2 = await prisma.usuario.upsert({
        where: { email: 'maria.santos@senai.br' },
        update: {},
        create: {
            nome: 'Maria Santos',
            email: 'maria.santos@senai.br',
            senhaHash,
            cargo: 'Instrutora',
            papel: 'COLABORADOR',
            equipeId: equipeDesenv.id,
        },
    })

    const colaborador3 = await prisma.usuario.upsert({
        where: { email: 'pedro.alves@senai.br' },
        update: {},
        create: {
            nome: 'Pedro Alves',
            email: 'pedro.alves@senai.br',
            senhaHash,
            cargo: 'Instrutor',
            papel: 'COLABORADOR',
            equipeId: equipeGestao.id,
        },
    })

    console.log('✅ Usuários criados (senha padrão: senha123)')

    // --- 3. CRIAR COMPETÊNCIAS / SOFT SKILLS ---
    const competencias = await Promise.all([
        prisma.competencia.upsert({ where: { nome: 'Comunicação' }, update: {}, create: { nome: 'Comunicação', descricao: 'Clareza e objetividade na comunicação verbal e escrita', categoria: 'Interpessoal' } }),
        prisma.competencia.upsert({ where: { nome: 'Trabalho em Equipe' }, update: {}, create: { nome: 'Trabalho em Equipe', descricao: 'Colaboração e sinergia com colegas', categoria: 'Interpessoal' } }),
        prisma.competencia.upsert({ where: { nome: 'Proatividade' }, update: {}, create: { nome: 'Proatividade', descricao: 'Iniciativa e antecipação de problemas', categoria: 'Atitudinal' } }),
        prisma.competencia.upsert({ where: { nome: 'Resolução de Problemas' }, update: {}, create: { nome: 'Resolução de Problemas', descricao: 'Capacidade analítica e criativa para resolver desafios', categoria: 'Cognitiva' } }),
        prisma.competencia.upsert({ where: { nome: 'Liderança' }, update: {}, create: { nome: 'Liderança', descricao: 'Influência positiva e desenvolvimento da equipe', categoria: 'Liderança' } }),
        prisma.competencia.upsert({ where: { nome: 'Adaptabilidade' }, update: {}, create: { nome: 'Adaptabilidade', descricao: 'Flexibilidade diante de mudanças e novas situações', categoria: 'Atitudinal' } }),
    ])

    console.log('✅ Competências criadas')

    // --- 4. CRIAR CICLO DE AVALIAÇÃO ---
    const ciclo = await prisma.cicloAvaliacao.upsert({
        where: { id: 1 },
        update: {},
        create: {
            nome: 'Q1 2024 — Janeiro a Março',
            dataInicio: new Date('2024-01-01'),
            dataFim: new Date('2024-03-31'),
            fechado: false,
        },
    })

    console.log('✅ Ciclo de avaliação criado')

    // --- 5. CRIAR AVALIAÇÕES DE EXEMPLO ---
    // Admin avalia João em todas as competências
    // A pontuação determina automaticamente o nível
    const pontuacaoParaNivel = (p) => {
        if (p <= 4) return 'CRITICO'
        if (p <= 6) return 'EM_DESENVOLVIMENTO'
        if (p <= 8) return 'ATINGIU'
        return 'EXCEDEU'
    }

    const avaliacoesJoao = [
        { competenciaId: competencias[0].id, pontuacao: 10 }, // Comunicação
        { competenciaId: competencias[1].id, pontuacao: 8 }, // Trabalho em Equipe
        { competenciaId: competencias[2].id, pontuacao: 5 }, // Proatividade
        { competenciaId: competencias[3].id, pontuacao: 9 }, // Resolução de Problemas
        { competenciaId: competencias[4].id, pontuacao: 3 }, // Liderança
        { competenciaId: competencias[5].id, pontuacao: 7 }, // Adaptabilidade
    ]

    for (const av of avaliacoesJoao) {
        await prisma.avaliacao.upsert({
            where: { avaliadorId_avaliadoId_cicloId_competenciaId_tipo: { avaliadorId: admin.id, avaliadoId: colaborador1.id, cicloId: ciclo.id, competenciaId: av.competenciaId, tipo: 'LIDER' } },
            update: { pontuacao: av.pontuacao, nivel: pontuacaoParaNivel(av.pontuacao) },
            create: { avaliadorId: admin.id, avaliadoId: colaborador1.id, cicloId: ciclo.id, competenciaId: av.competenciaId, pontuacao: av.pontuacao, nivel: pontuacaoParaNivel(av.pontuacao), tipo: 'LIDER' },
        })
    }

    // Maria avalia João (avaliação 360°)
    const avaliacoes360 = [
        { competenciaId: competencias[0].id, pontuacao: 8 },
        { competenciaId: competencias[1].id, pontuacao: 9 },
        { competenciaId: competencias[2].id, pontuacao: 7 },
        { competenciaId: competencias[3].id, pontuacao: 8 },
        { competenciaId: competencias[4].id, pontuacao: 5 },
        { competenciaId: competencias[5].id, pontuacao: 9 },
    ]

    for (const av of avaliacoes360) {
        await prisma.avaliacao.upsert({
            where: { avaliadorId_avaliadoId_cicloId_competenciaId_tipo: { avaliadorId: colaborador2.id, avaliadoId: colaborador1.id, cicloId: ciclo.id, competenciaId: av.competenciaId, tipo: 'PAR' } },
            update: { pontuacao: av.pontuacao, nivel: pontuacaoParaNivel(av.pontuacao) },
            create: { avaliadorId: colaborador2.id, avaliadoId: colaborador1.id, cicloId: ciclo.id, competenciaId: av.competenciaId, pontuacao: av.pontuacao, nivel: pontuacaoParaNivel(av.pontuacao), tipo: 'PAR' },
        })
    }

    console.log('✅ Avaliações de exemplo criadas')
    console.log('\n🎉 Seed concluído com sucesso!')
    console.log('📧 Usuários disponíveis:')
    console.log('   Admin:        admin@senai.br / senha123')
    console.log('   Colaborador1: joao.silva@senai.br / senha123')
    console.log('   Colaborador2: maria.santos@senai.br / senha123')
    console.log('   Colaborador3: pedro.alves@senai.br / senha123')
}

main()
    .catch((e) => {
        console.error('❌ Erro no seed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
