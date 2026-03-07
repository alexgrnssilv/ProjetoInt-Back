const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const admin = await prisma.usuario.findUnique({
            where: { email: 'admin@senai.br' }
        });
        console.log('ADMIN USER:', JSON.stringify(admin, null, 2));

        const todosUsuarios = await prisma.usuario.findMany();
        console.log('LISTA DE TODOS USUARIOS:', todosUsuarios.map(u => `${u.id}: ${u.nome} (${u.papel})`));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
