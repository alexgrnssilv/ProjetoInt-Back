const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function reset() {
    const email = 'admin@senai.br'
    const novaSenha = 'senha123'
    const hash = await bcrypt.hash(novaSenha, 10)

    console.log(`--- RESETANDO SENHA PARA: ${email} ---`)

    const user = await prisma.usuario.update({
        where: { email },
        data: { senhaHash: hash }
    })

    console.log('✅ Senha alterada com sucesso!')
    console.log('Novo hash:', hash)

    await prisma.$disconnect()
}

reset()
