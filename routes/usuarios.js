import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/', async (req, res) => {
    console.log('📥 Recebendo requisição para criar usuário:', req.body);

    const { nome, email, senha, telefone, cpf } = req.body;

    if (!nome || !email || !senha) {
        console.log('❌ Campos obrigatórios faltando');
        return res.status(400).json({
            error: 'Nome, email e senha são obrigatórios.'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log('❌ Email inválido:', email);
        return res.status(400).json({
            error: 'Formato de email inválido.'
        });
    }

    if (senha.length < 6) {
        console.log('❌ Senha muito curta');
        return res.status(400).json({
            error: 'A senha deve ter pelo menos 6 caracteres.'
        });
    }

    try {
        console.log('🔍 Verificando se email já existe:', email);

        const usuarioExistente = await prisma.usuario.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (usuarioExistente) {
            console.log('❌ Email já cadastrado:', email);
            return res.status(409).json({
                error: 'Este email já está cadastrado.'
            });
        }

        console.log('🔐 Gerando hash da senha...');
        const saltRounds = 12;
        const senhaHash = await bcrypt.hash(senha, saltRounds);

        console.log('📝 Criando usuário no banco...');
        const novoUsuario = await prisma.usuario.create({
            data: {
                nome: nome.trim(),
                email: email.toLowerCase().trim(),
                senha: senhaHash,
                telefone: telefone ? telefone.trim() : null,
                cpf: cpf ? cpf.replace(/\D/g, '') : null,
                tipo: 'cliente',
                isAdmin: false
            },
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                cpf: true,
                tipo: true,
                criadoEm: true
            }
        });

        console.log('✅ Usuário criado com sucesso:', novoUsuario.id);

        return res.status(201).json({
            message: 'Usuário criado com sucesso!',
            usuario: novoUsuario
        });

    } catch (error) {
        console.error('❌ Erro ao criar usuário:', error);

        if (error.code === 'P2002') {
            return res.status(409).json({
                error: 'Este email já está cadastrado.'
            });
        }

        return res.status(500).json({
            error: 'Erro interno do servidor ao criar usuário.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/', verifyAdmin, async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                cpf: true,
                tipo: true,
                isAdmin: true,
                criadoEm: true
            },
            orderBy: {
                criadoEm: 'desc'
            }
        });
        return res.json(usuarios);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

router.get('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                cpf: true,
                tipo: true,
                isAdmin: true,
                criadoEm: true
            }
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        return res.json(usuario);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        return res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

router.put('/meu-perfil', verifyToken, async (req, res) => {
    try {
        const { nome, telefone, cpf } = req.body;
        const userId = req.userId;

        console.log('👤 Atualizando perfil do usuário:', userId);
        console.log('📋 Dados recebidos:', { nome, telefone, cpf });
        console.log('🔐 Usuário autenticado ID:', userId);

        if (!nome || nome.trim().length === 0) {
            return res.status(400).json({
                error: 'Nome é obrigatório.'
            });
        }

        const usuarioExistente = await prisma.usuario.findUnique({
            where: { id: userId }
        });

        if (!usuarioExistente) {
            console.log('❌ Usuário não encontrado no banco:', userId);
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const dadosAtualizacao = {
            nome: nome.trim()
        };

        if (telefone !== undefined) {
            dadosAtualizacao.telefone = telefone ? telefone.replace(/\D/g, '') : null;
        }

        if (cpf !== undefined) {
            const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : null;
            
            if (cpfLimpo && cpfLimpo.length === 11) {
                const cpfExistente = await prisma.usuario.findFirst({
                    where: {
                        cpf: cpfLimpo,
                        id: { not: userId }
                    }
                });

                if (cpfExistente) {
                    return res.status(409).json({ error: 'CPF já está em uso por outro usuário.' });
                }
                dadosAtualizacao.cpf = cpfLimpo;
            } else if (cpfLimpo === '') {
                dadosAtualizacao.cpf = null;
            }
        }

        console.log('📝 Dados para atualização:', dadosAtualizacao);

        const usuarioAtualizado = await prisma.usuario.update({
            where: { id: userId },
            data: dadosAtualizacao,
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                cpf: true,
                tipo: true,
                isAdmin: true,
                criadoEm: true
            }
        });

        console.log('✅ Perfil atualizado com sucesso:', usuarioAtualizado.id);

        return res.json({
            message: 'Perfil atualizado com sucesso!',
            usuario: usuarioAtualizado
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar perfil:', error);

        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'CPF já está em uso por outro usuário.' });
        }

        return res.status(500).json({
            error: 'Erro interno ao atualizar perfil.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.patch('/minha-senha', verifyToken, async (req, res) => {
    try {
        const { senhaAtual, novaSenha } = req.body;
        const userId = req.userId;

        console.log('🔐 Atualizando senha do usuário:', userId);

        if (!senhaAtual || !novaSenha) {
            return res.status(400).json({
                error: 'Senha atual e nova senha são obrigatórias.'
            });
        }

        if (novaSenha.length < 6) {
            return res.status(400).json({
                error: 'A nova senha deve ter pelo menos 6 caracteres.'
            });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { id: userId }
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const senhaAtualCorreta = await bcrypt.compare(senhaAtual, usuario.senha);
        if (!senhaAtualCorreta) {
            console.log('❌ Senha atual incorreta para usuário:', userId);
            return res.status(401).json({ error: 'Senha atual incorreta.' });
        }

        const saltRounds = 12;
        const novaSenhaHash = await bcrypt.hash(novaSenha, saltRounds);

        await prisma.usuario.update({
            where: { id: userId },
            data: { senha: novaSenhaHash }
        });

        console.log('✅ Senha atualizada com sucesso para usuário:', userId);

        return res.json({ message: 'Senha atualizada com sucesso!' });

    } catch (error) {
        console.error('❌ Erro ao atualizar senha:', error);
        return res.status(500).json({ error: 'Erro interno ao atualizar senha.' });
    }
});

router.put('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { nome, email, telefone, cpf, tipo, isAdmin } = req.body;

    try {
        const usuarioExistente = await prisma.usuario.findUnique({
            where: { id: parseInt(id) }
        });

        if (!usuarioExistente) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        if (email && email !== usuarioExistente.email) {
            const emailEmUso = await prisma.usuario.findUnique({
                where: { email: email.toLowerCase() }
            });

            if (emailEmUso) {
                return res.status(409).json({ error: 'Este email já está em uso.' });
            }
        }

        const usuarioAtualizado = await prisma.usuario.update({
            where: { id: parseInt(id) },
            data: {
                ...(nome && { nome: nome.trim() }),
                ...(email && { email: email.toLowerCase().trim() }),
                ...(telefone !== undefined && { telefone: telefone ? telefone.trim() : null }),
                ...(cpf !== undefined && { cpf: cpf ? cpf.replace(/\D/g, '') : null }),
                ...(tipo && { tipo }),
                ...(isAdmin !== undefined && { isAdmin })
            },
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                cpf: true,
                tipo: true,
                isAdmin: true,
                criadoEm: true
            }
        });

        return res.json({
            message: 'Usuário atualizado com sucesso!',
            usuario: usuarioAtualizado
        });

    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);

        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Este email já está em uso.' });
        }

        return res.status(500).json({ error: 'Erro interno ao atualizar usuário.' });
    }
});

router.patch('/:id/senha', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { novaSenha } = req.body;

    if (!novaSenha || novaSenha.length < 6) {
        return res.status(400).json({
            error: 'Nova senha é obrigatória e deve ter pelo menos 6 caracteres.'
        });
    }

    try {
        const usuarioExistente = await prisma.usuario.findUnique({
            where: { id: parseInt(id) }
        });

        if (!usuarioExistente) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const saltRounds = 12;
        const novaSenhaHash = await bcrypt.hash(novaSenha, saltRounds);

        await prisma.usuario.update({
            where: { id: parseInt(id) },
            data: { senha: novaSenhaHash }
        });

        return res.json({ message: 'Senha atualizada com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar senha:', error);
        return res.status(500).json({ error: 'Erro interno ao atualizar senha.' });
    }
});

router.delete('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const usuarioExistente = await prisma.usuario.findUnique({
            where: { id: parseInt(id) }
        });

        if (!usuarioExistente) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        if (usuarioExistente.isAdmin && req.userId === usuarioExistente.id) {
            return res.status(403).json({
                error: 'Não é possível excluir sua própria conta de administrador.'
            });
        }

        await prisma.usuario.delete({
            where: { id: parseInt(id) }
        });

        return res.json({ message: 'Usuário excluído com sucesso!' });

    } catch (error) {
        console.error('Erro ao excluir usuário:', error);

        const agendamentosVinculados = await prisma.agendamento.findMany({
            where: {
                OR: [
                    { email: usuarioExistente?.email },
                    { telefone: usuarioExistente?.telefone }
                ]
            }
        });

        if (agendamentosVinculados.length > 0) {
            return res.status(409).json({
                error: 'Não é possível excluir usuário com agendamentos vinculados.'
            });
        }

        return res.status(500).json({ error: 'Erro interno ao excluir usuário.' });
    }
});

router.get('/admin/estatisticas', verifyAdmin, async (req, res) => {
    try {
        const totalUsuarios = await prisma.usuario.count();
        const totalClientes = await prisma.usuario.count({
            where: { tipo: 'cliente' }
        });
        const totalAdmins = await prisma.usuario.count({
            where: { isAdmin: true }
        });
        const usuariosHoje = await prisma.usuario.count({
            where: {
                criadoEm: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }
        });

        return res.json({
            totalUsuarios,
            totalClientes,
            totalAdmins,
            usuariosHoje
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

export default router;