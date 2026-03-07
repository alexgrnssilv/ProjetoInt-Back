// =====================================================
// auth.controller.js — Lógica de Login e Registro
// =====================================================

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

/**
 * POST /api/auth/login
 * Autentica o usuário e retorna um token JWT
 */
const login = async (req, res) => {
    const { email, senha } = req.body

    if (!email || !senha) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Email e senha são obrigatórios.',
        })
    }

    try {
        // Busca o usuário pelo email (único)
        const usuario = await prisma.usuario.findUnique({
            where: { email },
            include: { equipe: { select: { id: true, nome: true } } },
        })

        if (!usuario || !usuario.ativo) {
            return res.status(401).json({
                sucesso: false,
                // Mensagem genérica por segurança (não revela se o email existe)
                mensagem: 'Credenciais inválidas.',
            })
        }

        // bcrypt.compare compara a senha enviada com o hash armazenado
        const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash)
        if (!senhaCorreta) {
            return res.status(401).json({ sucesso: false, mensagem: 'Credenciais inválidas.' })
        }

        // Payload do JWT: dados não-sensíveis que ficam disponíveis nos middlewares
        const payload = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            papel: usuario.papel,
            equipeId: usuario.equipeId,
        }

        // Assina o token com a chave secreta e tempo de expiração definidos no .env
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN,
        })

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Login realizado com sucesso.',
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                papel: usuario.papel,
                cargo: usuario.cargo,
                equipe: usuario.equipe,
            },
        })
    } catch (erro) {
        console.error('[Auth] Erro no login:', erro)
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' })
    }
}

/**
 * POST /api/auth/registrar
 * Cria um novo colaborador (apenas Admins podem criar usuários)
 */
const registrar = async (req, res) => {
    const { nome, email, senha, cargo, papel, equipeId } = req.body

    if (!nome || !email || !senha) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Nome, email e senha são obrigatórios.',
        })
    }

    try {
        // Verifica se o email já está em uso
        const existente = await prisma.usuario.findUnique({ where: { email } })
        if (existente) {
            return res.status(409).json({ sucesso: false, mensagem: 'Este email já está cadastrado.' })
        }

        // Gera o hash da senha com custo 10 (recomendado para produção)
        const senhaHash = await bcrypt.hash(senha, 10)

        const novoUsuario = await prisma.usuario.create({
            data: {
                nome,
                email,
                senhaHash,
                cargo: cargo || null,
                papel: papel || 'COLABORADOR',
                equipeId: equipeId || null,
            },
        })

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Usuário criado com sucesso.',
            usuario: { id: novoUsuario.id, nome: novoUsuario.nome, email: novoUsuario.email, papel: novoUsuario.papel },
        })
    } catch (erro) {
        console.error('[Auth] Erro no registro:', erro)
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' })
    }
}

/**
 * GET /api/auth/perfil
 * Retorna os dados do usuário autenticado (baseado no token)
 */
const perfil = async (req, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.usuario.id },
            select: {
                id: true, nome: true, email: true,
                cargo: true, papel: true, criadoEm: true,
                equipe: { select: { id: true, nome: true } },
            },
        })
        return res.status(200).json({ sucesso: true, usuario })
    } catch (erro) {
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' })
    }
}

module.exports = { login, registrar, perfil }
