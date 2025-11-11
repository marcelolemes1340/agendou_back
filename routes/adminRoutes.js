import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';

const router = express.Router();

router.post('/register-admin', async (req, res) => {
    const { nome, email, senha, telefone, cpf } = req.body;

    try {
        const adminCount = await prisma.usuario.count({ where: { isAdmin: true } });
        if (adminCount > 0) return res.status(403).json({ error: "Já existe um administrador." });
    } catch (error) {
        console.warn("Não foi possível contar admins, permitindo registro...");
    }

    try {
        const hashedPassword = await bcrypt.hash(senha, 10);
        const novoAdmin = await prisma.usuario.create({
            data: { nome, email, senha: hashedPassword, telefone, cpf, isAdmin: true, tipo: 'admin' }
        });

        res.status(201).json({ message: "Administrador registrado com sucesso.", userId: novoAdmin.id });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: "Este email já está cadastrado." });
        res.status(500).json({ error: "Erro interno ao registrar administrador." });
    }
});

export default router;
