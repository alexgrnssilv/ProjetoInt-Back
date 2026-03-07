const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- TESTANDO DELETE USUARIO (ID 3 - Maria Santos) ---');
        const userId = 3;

        // Simulating the route logic
        const deletedAvs = await prisma.avaliacao.deleteMany({
            where: { OR: [{ avaliadorId: userId }, { avaliadoId: userId }] }
        });
        console.log('Avaliacoes deletadas:', deletedAvs.count);

        const deletedUser = await prisma.usuario.delete({
            where: { id: userId }
        });
        console.log('Usuario deletado:', deletedUser.nome);

        console.log('\n--- TESTANDO DELETE CICLO (ID 2 - Testes) ---');
        const cicloId = 2;

        const deletedAvsCiclo = await prisma.avaliacao.deleteMany({
            where: { cicloId: cicloId }
        });
        console.log('Avaliacoes do ciclo deletadas:', deletedAvsCiclo.count);

        const deletedCiclo = await prisma.cicloAvaliacao.delete({
            where: { id: cicloId }
        });
        console.log('Ciclo deletado:', deletedCiclo.nome);

    } catch (e) {
        console.error('ERRO NO TESTE DB:', e.message);
        if (e.code) console.error('Codigo Prisma:', e.code);
    } finally {
        await prisma.$disconnect();
    }
}

main();
