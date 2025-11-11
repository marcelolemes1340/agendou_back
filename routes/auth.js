import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const authRouter = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro_e_longo';

// Login Admin
authRouter.post('/login-admin', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) return res.status(400).json({ error: "Email e senha são obrigatórios." });

    try {
        const admin = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });

        if (!admin || admin.tipo !== 'admin' || admin.isAdmin !== true) {
            return res.status(403).json({ error: "Acesso negado. Apenas administradores." });
        }

        const senhaCorreta = await bcrypt.compare(senha, admin.senha);
        if (!senhaCorreta) return res.status(401).json({ error: "Credenciais inválidas." });

        const token = jwt.sign({ id: admin.id, email: admin.email, tipo: admin.tipo, isAdmin: admin.isAdmin }, JWT_SECRET, { expiresIn: '1d' });

        return res.json({
            token,
            usuario: { id: admin.id, nome: admin.nome, email: admin.email, tipo: admin.tipo }
        });
    } catch (error) {
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Registro Admin (primeiro admin)
authRouter.post('/register-admin', async (req, res) => {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ error: "Todos os campos são obrigatórios." });

    try {
        const existingAdmin = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
        if (existingAdmin && existingAdmin.tipo === 'admin') return res.status(200).json({ message: "Administrador já registrado." });
        if (existingAdmin) return res.status(409).json({ error: "Email já em uso." });

        const senhaHash = await bcrypt.hash(senha, 10);
        const newAdmin = await prisma.usuario.create({
            data: { nome, email: email.toLowerCase(), senha: senhaHash, tipo: 'admin', isAdmin: true }
        });

        res.status(201).json({ message: "Administrador registrado com sucesso!", usuario: { id: newAdmin.id, nome: newAdmin.nome, email: newAdmin.email, tipo: newAdmin.tipo } });
    } catch (error) {
        res.status(500).json({ error: "Erro interno do servidor ao registrar administrador." });
    }
});

export default authRouter;
