const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function testLogin(email, senha) {
    console.log(`--- TESTANDO LOGIN PARA: ${email} ---`)
    const user = await prisma.usuario.findUnique({ where: { email } })

    if (!user) {
        console.log('❌ Usuário não encontrado.')
        return
    }

    const matches = await bcrypt.compare(senha, user.senhaHash)
    console.log(`Senha fornecida: "${senha}"`)
    console.log(`Resultado do match: ${matches}`)

    await prisma.$disconnect()
}

// Testando as duas possibilidades comuns
testLogin('admin@senai.br', 'senha123')
