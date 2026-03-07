// =====================================================
// authMiddleware.js — Validação de Token JWT
// Protege todas as rotas que requerem autenticação
// =====================================================

const jwt = require('jsonwebtoken')

/**
 * Middleware que verifica se o usuário possui um token JWT válido.
 * Deve ser usado em todas as rotas protegidas.
 *
 * Fluxo:
 * 1. Extrai o token do header "Authorization: Bearer <token>"
 * 2. Verifica a assinatura e validade do token
 * 3. Injeta os dados do usuário em req.user para uso nos controllers
 */
const verificarToken = (req, res, next) => {
    // Pega o valor completo do header Authorization
    const authHeader = req.headers['authorization']

    // O token vem no formato "Bearer eyJhbGci..."
    // O split separa ["Bearer", "eyJhbGci..."] e pegamos o índice 1
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Acesso negado. Token não fornecido.',
        })
    }

    try {
        // jwt.verify valida a assinatura e decodifica o payload
        // Se o token expirou ou foi manipulado, lança um erro
        const dadosDecodificados = jwt.verify(token, process.env.JWT_SECRET)

        // Injeta os dados do usuário no objeto request para os próximos middlewares/controllers
        req.usuario = dadosDecodificados

        next() // Passa para o próximo middleware ou controller
    } catch (erro) {
        // Token expirado: erro.name === 'TokenExpiredError'
        // Token inválido: erro.name === 'JsonWebTokenError'
        if (erro.name === 'TokenExpiredError') {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Token expirado. Faça login novamente.',
            })
        }

        return res.status(401).json({
            sucesso: false,
            mensagem: 'Token inválido.',
        })
    }
}

module.exports = { verificarToken }
