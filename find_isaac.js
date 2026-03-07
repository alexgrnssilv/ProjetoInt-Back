const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.usuario.findMany({
            where: {
                nome: { contains: 'Isaac', mode: 'insensitive' }
            }
        });
        console.log('USUARIOS ENCONTRADOS:');
        console.log(JSON.stringify(users, null, 2));

        const avaliacoes = await prisma.avaliacao.findMany({
            take: 10
        });
        console.log('EXEMPLO DE AVALIACOES:');
        console.log(JSON.stringify(avaliacoes, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
