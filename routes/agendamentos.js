import { Router } from 'express';
import prisma from '../config/prisma.js';
import { verifyAdmin } from '../middlewares/authMiddleware.js'; // 🚨 Proteção!

const router = Router();

// Rota POST (Cliente) - PÚBLICA
router.post('/', async (req, res) => { /* ... lógica de criação ... */ });


// Rota GET / (Admin) - PROTEGIDA
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const agendamentos = await prisma.agendamento.findMany({
            // 🚨 Recomendo fazer um include leve aqui também para o nome do cliente,
            // se o campo 'nome' na sua tabela Agendamento for o nome do usuário.
            orderBy: { criadoEm: 'desc' }
        });
        return res.json(agendamentos);
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
});

// -----------------------------------------------------------
// Rota GET /:id (Admin) - PROTEGIDA (BUSCA DETALHES DO AGENDAMENTO E DO USUÁRIO)
// -----------------------------------------------------------
router.get('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: parseInt(id) }, // Converte o ID da URL para inteiro
            // 🚨 ESSENCIAL: Busca os dados do usuário para pegar E-MAIL e TELEFONE
            include: {
                usuario: {
                    select: {
                        email: true,
                        telefone: true
                    }
                }
            }
        });

        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }

        // Formata o objeto de retorno para que o Frontend o consuma facilmente
        const dadosCompletos = {
            ...agendamento,
            // Adiciona email e telefone no nível raiz do objeto
            email: agendamento.usuario.email,
            telefone: agendamento.usuario.telefone,
            // Remove o objeto 'usuario' aninhado para limpar o retorno (opcional)
            usuario: undefined
        };

        return res.json(dadosCompletos);

    } catch (error) {
        console.error('Erro ao buscar agendamento por ID:', error);
        return res.status(500).json({ error: 'Erro interno ao buscar agendamento.' });
    }
});

// -----------------------------------------------------------
// Rota PATCH /:id (Admin) - PROTEGIDA (ATUALIZA STATUS)
// Mantenho /:id e o Frontend envia {status: 'novo'}
// -----------------------------------------------------------
router.patch('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Validação para garantir que o status é um valor aceito
    const statusValidos = ['pendente', 'confirmado', 'cancelado', 'concluido'];
    if (!status || !statusValidos.includes(status.toLowerCase())) {
        return res.status(400).json({ error: 'Status de agendamento inválido fornecido.' });
    }

    try {
        const agendamentoAtualizado = await prisma.agendamento.update({
            where: { id: parseInt(id) },
            data: {
                status: status.toLowerCase(),
            },
            // Inclui o usuário para que o frontend possa ver os dados atualizados de contato
            include: {
                usuario: {
                    select: {
                        email: true,
                        telefone: true
                    }
                }
            }
        });

        // Retorna o objeto completo formatado (igual ao GET)
        const dadosCompletos = {
            ...agendamentoAtualizado,
            email: agendamentoAtualizado.usuario.email,
            telefone: agendamentoAtualizado.usuario.telefone,
            usuario: undefined
        };

        return res.json(dadosCompletos);

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return res.status(500).json({ error: 'Erro interno ao atualizar status do agendamento.' });
    }
});


// Rota PUT /:id (Admin) - PROTEGIDA (ATUALIZAÇÃO COMPLETA)
router.put('/:id', verifyAdmin, async (req, res) => {
    return res.status(501).json({ error: 'Rota de atualização completa ainda não implementada.' });
});

// Rota DELETE /:id (Admin) - PROTEGIDA
router.delete('/:id', verifyAdmin, async (req, res) => {
    return res.status(501).json({ error: 'Rota de exclusão ainda não implementada.' });
});

export default router;