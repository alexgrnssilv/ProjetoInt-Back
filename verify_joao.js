const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const joao = await prisma.usuario.findUnique({ where: { email: 'joao.silva@senai.br' } });
        const cicloAtivo = await prisma.cicloAvaliacao.findFirst({ where: { fechado: false } });

        const autoEval = await prisma.avaliacao.findMany({
            where: {
                avaliadorId: joao.id,
                avaliadoId: joao.id,
                cicloId: cicloAtivo.id,
                tipo: 'AUTO'
            },
            include: { competencia: true }
        });

        console.log(`AUTOAVALIACOES DE JOAO (${joao.nome}):`, autoEval.length);
        autoEval.forEach(a => {
            console.log(`- ${a.competencia.nome}: ${a.pontuacao}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
