const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.usuario.findMany();
        console.log('USUARIOS NO BANCO:', users.map(u => `${u.id}: ${u.nome}`));

        const ciclos = await prisma.cicloAvaliacao.findMany();
        console.log('CICLOS NO BANCO:', ciclos.map(c => `${c.id}: ${c.nome}`));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
