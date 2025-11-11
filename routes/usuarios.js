// back-end/routes/usuarios.js (MODIFICADO)

import { Router } from 'express';
// 🚨 1. CORRIGE A IMPORTAÇÃO: Use a instância centralizada
import prisma from '../config/prisma.js';
// 🚨 2. IMPORTAÇÃO DO MIDDLEWARE: Para proteger as rotas
import { verifyAdmin } from '../middlewares/authMiddleware.js';

const router = Router();
// const prisma = new PrismaClient(); <--- REMOVA ESTA LINHA


// Exemplo: Listar Usuários (Rota de Administrador)
// 🔒 APLICAÇÃO DO MIDDLEWARE: SÓ ADMIN PODE VER A LISTA COMPLETA
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            // Excluir a senha por segurança ao retornar a lista
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                cpf: true,
                tipo: true,
                criadoEm: true
            },
            orderBy: {
                criadoEm: 'desc'
            }
        });
        return res.json(usuarios);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});


// Exemplo: Criar Usuário (Deve ser a rota de registro do cliente, PÚBLICA)
router.post('/', async (req, res) => {
    // ⚠️ Lógica de validação e hashing de senha deve ser aplicada aqui.
    // ...
});


// Exemplo: Deletar Usuário (Apenas Admin)
// 🔒 ROTA PROTEGIDA
router.delete('/:id', verifyAdmin, async (req, res) => {
    // ... lógica de exclusão ...
});


// ... Adicione o restante das suas rotas de usuários aqui (ex: GET /:id, PATCH /:id) ...

export default router;