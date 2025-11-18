import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro_e_longo_para_jwt_token';


authRouter.get('/check-token', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    console.log('🔍 Verificação simples de token...');
    
    if (!token) {
        return res.json({ authenticated: false });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const usuario = await prisma.usuario.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                tipo: true,
                isAdmin: true,
                criadoEm: true
            }
        });

        if (!usuario) {
            return res.json({ authenticated: false });
        }

        return res.json({ 
            authenticated: true,
            usuario 
        });
    } catch (error) {
        console.log('❌ Token inválido na verificação simples:', error.message);
        return res.json({ authenticated: false });
    }
});

authRouter.post('/login-admin', async (req, res) => {
    const { email, senha } = req.body;

    console.log('🔐 Tentativa de login admin:', { email });

    if (!email || !senha) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    try {
        const usuario = await prisma.usuario.findUnique({ 
            where: { email: email.toLowerCase().trim() } 
        });

        console.log('👤 Usuário encontrado:', usuario ? {
            id: usuario.id,
            email: usuario.email,
            tipo: usuario.tipo,
            isAdmin: usuario.isAdmin
        } : 'Não encontrado');

        if (!usuario || usuario.tipo !== 'admin' || !usuario.isAdmin) {
            console.log('❌ Acesso negado - Não é admin:', email);
            return res.status(403).json({ 
                error: "Acesso negado. Apenas administradores podem acessar esta área." 
            });
        }

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
        if (!senhaCorreta) {
            console.log('❌ Senha incorreta para admin:', email);
            return res.status(401).json({ error: "Credenciais inválidas." });
        }

        const token = jwt.sign(
            { 
                id: usuario.id, 
                email: usuario.email, 
                tipo: usuario.tipo,
                isAdmin: usuario.isAdmin 
            }, 
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('✅ Login admin bem-sucedido:', usuario.email);

        return res.json({
            message: "Login administrativo realizado com sucesso!",
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                telefone: usuario.telefone,
                tipo: usuario.tipo,
                isAdmin: usuario.isAdmin,
                criadoEm: usuario.criadoEm
            }
        });

    } catch (error) {
        console.error('❌ Erro no login admin:', error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});

authRouter.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    console.log('📥 Tentativa de login:', { email });

    if (!email || !senha) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    try {
        const usuario = await prisma.usuario.findUnique({ 
            where: { email: email.toLowerCase() } 
        });

        if (!usuario) {
            console.log('❌ Usuário não encontrado:', email);
            return res.status(401).json({ error: "Credenciais inválidas." });
        }

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
        if (!senhaCorreta) {
            console.log('❌ Senha incorreta para:', email);
            return res.status(401).json({ error: "Credenciais inválidas." });
        }

        const token = jwt.sign(
            { 
                id: usuario.id, 
                email: usuario.email, 
                tipo: usuario.tipo,
                isAdmin: usuario.isAdmin 
            }, 
            JWT_SECRET,  
            { expiresIn: '7d' }
        );

        console.log('✅ Login bem-sucedido:', usuario.email);
        console.log('🔑 Token gerado com secret:', JWT_SECRET);

        return res.json({
            message: "Login realizado com sucesso!",
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                telefone: usuario.telefone,
                tipo: usuario.tipo,
                isAdmin: usuario.isAdmin,
                criadoEm: usuario.criadoEm
            }
        });

    } catch (error) {
        console.error('❌ Erro no login:', error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});

authRouter.get('/verify', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    console.log('🔐 Verificando token no /verify...');
    console.log('📤 Token:', token ? 'Presente' : 'Ausente');

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido.' });
    }

    try {
        console.log('🔑 Usando JWT_SECRET para verificar:', JWT_SECRET);
        const decoded = jwt.verify(token, JWT_SECRET);
        
        console.log('✅ Token verificado com sucesso no /verify');

        const usuario = await prisma.usuario.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                tipo: true,
                isAdmin: true,
                criadoEm: true
            }
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        return res.json({ usuario });
    } catch (error) {
        console.error('❌ Erro ao verificar token no /verify:', error.message);
        return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
});
authRouter.get('/verify-admin', verifyToken, async (req, res) => {
    try {
        console.log('🔍 Verificando token admin para usuário:', req.userId);
        
        const admin = await prisma.usuario.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                tipo: true,
                isAdmin: true,
                criadoEm: true
            }
        });

        if (!admin || !admin.isAdmin) {
            console.log('❌ Usuário não é admin ou não encontrado');
            return res.status(403).json({ 
                error: 'Acesso negado. Apenas administradores.' 
            });
        }

        console.log('✅ Token admin verificado com sucesso:', admin.email);
        return res.json({ 
            message: "Token válido",
            usuario: admin 
        });

    } catch (error) {
        console.error('❌ Erro ao verificar token admin:', error);
        return res.status(500).json({ 
            error: 'Erro interno ao verificar token.' 
        });
    }
});

export default authRouter;