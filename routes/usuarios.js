import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Cadastro de usuário
router.post('/cadastro', async (req, res) => {
    const { nome, email, telefone, cpf, senha } = req.body;

    try {
        // Verifica se já existe usuário com o mesmo e-mail
        const usuarioExistente = await prisma.usuario.findUnique({
            where: { email },
        });

        if (usuarioExistente) {
            return res.status(400).json({ error: 'Email já cadastrado.' });
        }

        // Cria novo usuário
        const novoUsuario = await prisma.usuario.create({
            data: { nome, email, telefone, cpf, senha },
        });

        res.status(201).json({ message: 'Usuário cadastrado com sucesso!', usuario: novoUsuario });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
    }
});

router.get('/', async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany();
        res.json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }
});

// Login de usuário
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        // Verifica se o usuário existe
        const usuario = await prisma.usuario.findUnique({
            where: { email },
        });

        if (!usuario) {
            return res.status(401).json({ error: 'Email ou senha incorretos.' });
        }

        // Verifica se a senha está correta (sem hash)
        if (usuario.senha !== senha) {
            return res.status(401).json({ error: 'Email ou senha incorretos.' });
        }

        // Remove a senha antes de enviar os dados
        const { senha: _, ...usuarioSemSenha } = usuario;

        res.json({ message: 'Login bem-sucedido!', usuario: usuarioSemSenha });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao realizar login.' });
    }
});



export default router;
