const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const cicloAtivo = await prisma.cicloAvaliacao.findFirst({ where: { fechado: false } });
        console.log('CICLO ATIVO:', cicloAtivo.id);

        const autoAvaliacao = await prisma.avaliacao.findFirst({
            where: {
                avaliadorId: 5, // Isaac
                avaliadoId: 5,
                cicloId: cicloAtivo.id,
                tipo: 'AUTO'
            }
        });
        console.log('AUTOAVALIACAO ISAAC:', autoAvaliacao ? 'EXISTE' : 'PENDENTE');

        const colegas = await prisma.usuario.findMany({
            where: { id: { not: 5 }, equipeId: 2, ativo: true } // Assuming Isaac is in team 2 from previous logs
        });
        console.log('COLEGAS DE EQUIPE (TOTAL):', colegas.length);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
