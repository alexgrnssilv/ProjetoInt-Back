const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function list() {
    console.log('--- LISTA DE USUÁRIOS NO BANCO ---')
    const users = await prisma.usuario.findMany({
        include: { equipe: true }
    })

    users.forEach(u => {
        console.log(`ID: ${u.id} | Nome: ${u.nome} | Email: ${u.email} | Papel: ${u.papel} | Ativo: ${u.ativo}`)
    })

    await prisma.$disconnect()
}

list()
