
import express from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import { verifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();


router.post('/register-admin', async (req, res) => {
    const { nome, email, senha, telefone, cpf } = req.body;

    console.log('👨‍💼 Recebendo requisição para criar PRIMEIRO admin:', { nome, email });

    
    if (!nome || !email || !senha) {
        return res.status(400).json({
            error: 'Nome, email e senha são obrigatórios.'
        });
    }

    try {
        const adminCount = await prisma.usuario.count({ 
            where: { 
                isAdmin: true,
                tipo: 'admin'
            } 
        });

        if (adminCount > 0) {
            console.log('❌ Já existe um administrador cadastrado');
            return res.status(403).json({ 
                error: "Já existe um administrador cadastrado no sistema." 
            });
        }

        const usuarioExistente = await prisma.usuario.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (usuarioExistente) {
            return res.status(409).json({ 
                error: "Este email já está cadastrado." 
            });
        }

        console.log('🔐 Gerando hash da senha...');
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(senha, saltRounds);

        console.log('📝 Criando PRIMEIRO administrador no banco...');
        
        const novoAdmin = await prisma.usuario.create({
            data: { 
                nome: nome.trim(),
                email: email.toLowerCase().trim(),
                senha: hashedPassword, 
                telefone: telefone ? telefone.replace(/\D/g, '') : null, 
                cpf: cpf ? cpf.replace(/\D/g, '') : null, 
                isAdmin: true, 
                tipo: 'admin' 
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

        console.log('✅ PRIMEIRO Administrador criado com sucesso:', novoAdmin.id);

        res.status(201).json({ 
            message: "Primeiro administrador registrado com sucesso!", 
            usuario: novoAdmin 
        });

    } catch (error) {
        console.error('❌ Erro ao criar primeiro administrador:', error);
        
        if (error.code === 'P2002') {
            return res.status(409).json({ 
                error: "Este email já está cadastrado." 
            });
        }
        
        res.status(500).json({ 
            error: "Erro interno ao registrar administrador.",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.post('/create-admin', verifyAdmin, async (req, res) => {
    const { nome, email, senha, telefone, cpf } = req.body;

    console.log('👨‍💼 ADMIN criando novo administrador:', { nome, email, criadoPor: req.userId });

    if (!nome || !email || !senha) {
        return res.status(400).json({
            error: 'Nome, email e senha são obrigatórios.'
        });
    }

    try {
        const usuarioExistente = await prisma.usuario.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (usuarioExistente) {
            if (usuarioExistente.isAdmin) {
                return res.status(409).json({ 
                    error: "Já existe um administrador com este email." 
                });
            } else {
                return res.status(409).json({ 
                    error: "Este email já está cadastrado como cliente." 
                });
            }
        }

        console.log('🔐 Gerando hash da senha...');
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(senha, saltRounds);

        console.log('📝 Criando novo administrador no banco...');
        
        const novoAdmin = await prisma.usuario.create({
            data: { 
                nome: nome.trim(),
                email: email.toLowerCase().trim(),
                senha: hashedPassword, 
                telefone: telefone ? telefone.replace(/\D/g, '') : null, 
                cpf: cpf ? cpf.replace(/\D/g, '') : null, 
                isAdmin: true, 
                tipo: 'admin' 
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

        console.log('✅ Novo Administrador criado com sucesso:', novoAdmin.id);

        res.status(201).json({ 
            message: "Novo administrador criado com sucesso!", 
            usuario: novoAdmin 
        });

    } catch (error) {
        console.error('❌ Erro ao criar novo administrador:', error);
        
        if (error.code === 'P2002') {
            return res.status(409).json({ 
                error: "Este email já está cadastrado." 
            });
        }
        
        res.status(500).json({ 
            error: "Erro interno ao criar administrador.",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.post('/emergency-admin', async (req, res) => {
    const { nome, email, senha, telefone, cpf } = req.body;

    console.log('🚨 MODO EMERGÊNCIA: Criando admin sem verificação...', { nome, email });

    if (!nome || !email || !senha) {
        return res.status(400).json({
            error: 'Nome, email e senha são obrigatórios.'
        });
    }

    try {
        const usuarioExistente = await prisma.usuario.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (usuarioExistente) {
            console.log('🔄 Convertendo usuário existente para admin...');
            
            const adminAtualizado = await prisma.usuario.update({
                where: { id: usuarioExistente.id },
                data: { 
                    isAdmin: true, 
                    tipo: 'admin',
                    ...(nome && { nome: nome.trim() }),
                    ...(senha && { 
                        senha: await bcrypt.hash(senha, 12) 
                    })
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

            console.log('✅ Usuário convertido para admin:', adminAtualizado.id);

            return res.status(200).json({ 
                message: "Usuário existente convertido para administrador com sucesso!", 
                usuario: adminAtualizado 
            });
        }

        console.log('🔐 Gerando hash da senha...');
        const hashedPassword = await bcrypt.hash(senha, 12);

        console.log('📝 Criando administrador no banco...');
        
        const novoAdmin = await prisma.usuario.create({
            data: { 
                nome: nome.trim(),
                email: email.toLowerCase().trim(),
                senha: hashedPassword, 
                telefone: telefone ? telefone.replace(/\D/g, '') : null, 
                cpf: cpf ? cpf.replace(/\D/g, '') : null, 
                isAdmin: true, 
                tipo: 'admin' 
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

        console.log('✅ Administrador criado com sucesso (emergência):', novoAdmin.id);

        res.status(201).json({ 
            message: "Administrador criado com sucesso (modo emergência)!", 
            usuario: novoAdmin 
        });

    } catch (error) {
        console.error('❌ Erro ao criar administrador (emergência):', error);
        
        if (error.code === 'P2002') {
            return res.status(409).json({ 
                error: "Este email já está cadastrado." 
            });
        }
        
        res.status(500).json({ 
            error: "Erro interno ao criar administrador.",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/dashboard', verifyAdmin, async (req, res) => {
    try {
        console.log('📊 Buscando dados do dashboard admin...');
        
        const [
            totalUsuarios,
            totalAgendamentos,
            agendamentosHoje,
            agendamentosPendentes
        ] = await Promise.all([
            prisma.usuario.count(),
            prisma.agendamento.count(),
            prisma.agendamento.count({
                where: {
                    data: new Date().toISOString().split('T')[0]
                }
            }),
            prisma.agendamento.count({
                where: {
                    status: 'pendente'
                }
            })
        ]);

        const estatisticas = {
            totalUsuarios,
            totalAgendamentos,
            agendamentosHoje,
            agendamentosPendentes,
            timestamp: new Date().toISOString()
        };

        console.log('✅ Estatísticas do dashboard:', estatisticas);
        return res.json(estatisticas);

    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas do dashboard:', error);
        return res.status(500).json({ 
            error: 'Erro interno ao buscar estatísticas.' 
        });
    }
});

export default router;