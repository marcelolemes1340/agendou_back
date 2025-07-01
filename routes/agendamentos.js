import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/', async (req, res) => {
    const { servico, profissional, data, horario, nome } = req.body;

    try {
        const agendamento = await prisma.agendamento.create({
            data: {
                servico,
                profissional,
                data,
                horario,
                nome
            }
        });

        return res.status(201).json({
            message: 'Agendamento salvo com sucesso!',
            agendamento
        });

    } catch (error) {
        console.error('Erro ao salvar agendamento:', error);
        return res.status(500).json({ error: 'Erro ao salvar agendamento' });
    }
});

// Rota para listar os agendamentos
router.get('/', async (req, res) => {
    try {
        const agendamentos = await prisma.agendamento.findMany();
        return res.json(agendamentos);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
});

export default router;
