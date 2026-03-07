const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    try {
        const senhaHash = await bcrypt.hash('senha123', 10);
        await prisma.usuario.updateMany({
            where: { email: 'isaac.maia@senai.br' },
            data: { senhaHash, ativo: true }
        });
        console.log('SENHA DE ISAAC RESETADA PARA: senha123');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
