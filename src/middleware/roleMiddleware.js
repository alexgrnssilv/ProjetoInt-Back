// =====================================================
// roleMiddleware.js — Controle de Acesso por Papel (ACL)
// Protege rotas exclusivas de administradores
// =====================================================

/**
 * Factory function que cria um middleware de verificação de papel (role).
 * 
 * Por que factory function?
 * Porque permite reutilizar o mesmo middleware para diferentes papéis.
 * Ex: requireRole('ADMIN'), requireRole('COLABORADOR')
 *
 * IMPORTANTE: Este middleware deve vir APÓS o verificarToken no pipeline,
 * pois depende do req.usuario que o authMiddleware injeta.
 *
 * @param {string} papelRequerido - O papel necessário para acessar a rota ('ADMIN' ou 'COLABORADOR')
 */
const requireRole = (papelRequerido) => {
    return (req, res, next) => {
        // Verifica se o usuário foi autenticado (requer authMiddleware antes)
        if (!req.usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário não autenticado.',
            })
        }

        // Verifica se o papel do usuário autenticado é o papel requerido
        if (req.usuario.papel !== papelRequerido) {
            return res.status(403).json({
                sucesso: false,
                // Não revelamos qual papel é necessário por segurança
                mensagem: 'Acesso proibido. Você não tem permissão para este recurso.',
            })
        }

        next() // Usuário tem o papel correto, segue em frente
    }
}

/**
 * Middleware que verifica se o usuário é o próprio colaborador ou um admin.
 * Usado para proteger rotas como GET /perfil/:id
 *
 * @param {string} paramName - Nome do parâmetro de rota que contém o ID do colaborador
 */
const requireOwnerOrAdmin = (paramName = 'id') => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ sucesso: false, mensagem: 'Não autenticado.' })
        }

        const idDaRota = parseInt(req.params[paramName])
        const isAdmin = req.usuario.papel === 'ADMIN'
        const isProprietario = req.usuario.id === idDaRota

        if (!isAdmin && !isProprietario) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Você só pode visualizar seu próprio perfil.',
            })
        }

        next()
    }
}

module.exports = { requireRole, requireOwnerOrAdmin }
