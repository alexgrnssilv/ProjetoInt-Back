const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
    console.log('--- DIAGNÓSTICO DE USUÁRIO ---')
    const user = await prisma.usuario.findUnique({
        where: { email: 'admin@senai.br' }
    })

    if (!user) {
        console.log('❌ ERRO: Usuário admin@senai.br NÃO encontrado no banco local!')
    } else {
        console.log('✅ Usuário encontrado!')
        console.log('ID:', user.id)
        console.log('Ativo:', user.ativo)
        console.log('Papel:', user.papel)
        console.log('Hash da Senha (primeiros 10 caracteres):', user.senhaHash.substring(0, 10))
    }
    await prisma.$disconnect()
}

check()
