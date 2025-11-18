import { Router } from 'express';
import prisma from '../config/prisma.js';
import { verifyAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/public', async (req, res) => {
    try {
        console.log('📋 Buscando barbeiros ativos para clientes...');
        
        const barbeiros = await prisma.barbeiro.findMany({
            where: { 
                ativo: true 
            },
            select: {
                id: true,
                nome: true,
                especialidade: true,
                foto: true
            },
            orderBy: { 
                nome: 'asc' 
            }
        });

        console.log(`✅ ${barbeiros.length} barbeiros ativos encontrados para clientes`);
        return res.json(barbeiros);
        
    } catch (error) {
        console.error('❌ Erro ao buscar barbeiros públicos:', error);
        return res.status(500).json({ 
            error: 'Erro ao buscar barbeiros',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor'
        });
    }
});
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const barbeiros = await prisma.barbeiro.findMany({
            orderBy: { nome: 'asc' }
        });
        return res.json(barbeiros);
    } catch (error) {
        console.error('Erro ao buscar barbeiros:', error);
        return res.status(500).json({ error: 'Erro ao buscar barbeiros' });
    }
});

router.post('/', verifyAdmin, async (req, res) => {
    const { nome, especialidade, foto } = req.body;

    console.log('📥 Recebendo requisição para criar barbeiro:', { nome, especialidade });

    if (!nome || nome.trim().length === 0) {
        return res.status(400).json({
            error: 'Nome do barbeiro é obrigatório.'
        });
    }

    try {
        const barbeiroExistente = await prisma.barbeiro.findFirst({
            where: { 
                nome: { 
                    equals: nome.trim(), 
                    mode: 'insensitive' 
                } 
            }
        });

        if (barbeiroExistente) {
            return res.status(409).json({
                error: 'Já existe um barbeiro com este nome.'
            });
        }

        console.log('📝 Criando novo barbeiro no banco...');
        
        const novoBarbeiro = await prisma.barbeiro.create({
            data: {
                nome: nome.trim(),
                especialidade: especialidade ? especialidade.trim() : null,
                foto: foto ? foto.trim() : null,
                ativo: true
            }
        });

        console.log('✅ Barbeiro criado com sucesso:', novoBarbeiro.id);

        return res.status(201).json({
            message: 'Barbeiro criado com sucesso!',
            barbeiro: novoBarbeiro
        });

    } catch (error) {
        console.error('❌ Erro ao criar barbeiro:', error);
        
        if (error.code === 'P2002') {
            return res.status(409).json({
                error: 'Já existe um barbeiro com este nome.'
            });
        }
        
        return res.status(500).json({
            error: 'Erro interno do servidor ao criar barbeiro.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const barbeiro = await prisma.barbeiro.findUnique({
            where: { id: parseInt(id) }
        });

        if (!barbeiro) {
            return res.status(404).json({ error: 'Barbeiro não encontrado.' });
        }

        return res.json(barbeiro);
    } catch (error) {
        console.error('Erro ao buscar barbeiro:', error);
        return res.status(500).json({ error: 'Erro ao buscar barbeiro' });
    }
});

router.put('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { nome, especialidade, foto, ativo } = req.body;

    try {
        const barbeiroExistente = await prisma.barbeiro.findUnique({
            where: { id: parseInt(id) }
        });

        if (!barbeiroExistente) {
            return res.status(404).json({ error: 'Barbeiro não encontrado.' });
        }

        if (nome && nome !== barbeiroExistente.nome) {
            const nomeEmUso = await prisma.barbeiro.findFirst({
                where: {
                    nome: { 
                        equals: nome.trim(), 
                        mode: 'insensitive' 
                    },
                    id: { not: parseInt(id) }
                }
            });

            if (nomeEmUso) {
                return res.status(409).json({ error: 'Já existe um barbeiro com este nome.' });
            }
        }

        const barbeiroAtualizado = await prisma.barbeiro.update({
            where: { id: parseInt(id) },
            data: {
                ...(nome && { nome: nome.trim() }),
                ...(especialidade !== undefined && { especialidade: especialidade ? especialidade.trim() : null }),
                ...(foto !== undefined && { foto: foto ? foto.trim() : null }),
                ...(ativo !== undefined && { ativo: ativo })
            }
        });

        return res.json({
            message: 'Barbeiro atualizado com sucesso!',
            barbeiro: barbeiroAtualizado
        });

    } catch (error) {
        console.error('Erro ao atualizar barbeiro:', error);

        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Já existe um barbeiro com este nome.' });
        }

        return res.status(500).json({ error: 'Erro interno ao atualizar barbeiro.' });
    }
});

router.delete('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const barbeiroExistente = await prisma.barbeiro.findUnique({
            where: { id: parseInt(id) }
        });

        if (!barbeiroExistente) {
            return res.status(404).json({ error: 'Barbeiro não encontrado.' });
        }

        const hoje = new Date().toISOString().split('T')[0];
        const agendamentosFuturos = await prisma.agendamento.findMany({
            where: {
                profissional: barbeiroExistente.nome,
                data: { gte: hoje },
                status: { in: ['pendente', 'confirmado'] }
            }
        });

        if (agendamentosFuturos.length > 0) {
            return res.status(409).json({
                error: 'Não é possível excluir barbeiro com agendamentos futuros. Desative-o temporariamente.'
            });
        }

        await prisma.barbeiro.delete({
            where: { id: parseInt(id) }
        });

        return res.json({ message: 'Barbeiro excluído com sucesso!' });

    } catch (error) {
        console.error('Erro ao excluir barbeiro:', error);
        return res.status(500).json({ error: 'Erro interno ao excluir barbeiro.' });
    }
});

router.patch('/:id/toggle-status', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const barbeiro = await prisma.barbeiro.findUnique({
            where: { id: parseInt(id) }
        });

        if (!barbeiro) {
            return res.status(404).json({ error: 'Barbeiro não encontrado.' });
        }

        const barbeiroAtualizado = await prisma.barbeiro.update({
            where: { id: parseInt(id) },
            data: { ativo: !barbeiro.ativo }
        });

        return res.json({
            message: `Barbeiro ${barbeiroAtualizado.ativo ? 'ativado' : 'desativado'} com sucesso!`,
            barbeiro: barbeiroAtualizado
        });

    } catch (error) {
        console.error('Erro ao alternar status do barbeiro:', error);
        return res.status(500).json({ error: 'Erro interno ao alternar status.' });
    }
});

router.get('/admin/estatisticas', verifyAdmin, async (req, res) => {
    try {
        const [
            totalBarbeiros,
            barbeirosAtivos,
            barbeirosInativos,
            barbeirosComEspecialidade
        ] = await Promise.all([
            prisma.barbeiro.count(),
            prisma.barbeiro.count({ where: { ativo: true } }),
            prisma.barbeiro.count({ where: { ativo: false } }),
            prisma.barbeiro.count({ 
                where: { 
                    especialidade: { not: null } 
                } 
            })
        ]);

        return res.json({
            totalBarbeiros,
            barbeirosAtivos,
            barbeirosInativos,
            barbeirosComEspecialidade,
            taxaAtivos: totalBarbeiros > 0 ? Math.round((barbeirosAtivos / totalBarbeiros) * 100) : 0
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});



router.get('/:id/agendamentos', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const barbeiro = await prisma.barbeiro.findUnique({
            where: { id: parseInt(id) }
        });

        if (!barbeiro) {
            return res.status(404).json({ error: 'Barbeiro não encontrado.' });
        }

        const agendamentos = await prisma.agendamento.findMany({
            where: {
                profissional: barbeiro.nome
            },
            orderBy: [
                { data: 'desc' },
                { horario: 'desc' }
            ]
        });

        return res.json({
            barbeiro: barbeiro.nome,
            totalAgendamentos: agendamentos.length,
            agendamentos
        });

    } catch (error) {
        console.error('Erro ao buscar agendamentos do barbeiro:', error);
        return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
});

router.get('/count', verifyAdmin, async (req, res) => {
    try {
        const count = await prisma.barbeiro.count({
            where: { ativo: true }
        });
        return res.json({ count });
    } catch (error) {
        console.error('Erro ao contar barbeiros:', error);
        return res.status(500).json({ error: 'Erro ao contar barbeiros' });
    }
});

export default router;