import { Router } from 'express';
import prisma from '../config/prisma.js';
import { verifyAdmin, verifyToken } from '../middlewares/authMiddleware.js';
import emailAgendamentoService from '../services/emailAgendamentoService.js';

const router = Router();

async function verificarEnvioEmailAgendamento(agendamento) {
  try {
    console.log('📧 Verificando se deve enviar email para novo agendamento...');
    
    const dataHoraAgendamento = new Date(agendamento.data + 'T' + agendamento.horario);
    const agora = new Date();
    const diferencaHoras = (dataHoraAgendamento - agora) / (1000 * 60 * 60);
    
    if (diferencaHoras <= 24 && diferencaHoras > 0) {
      console.log(`⏰ Agendamento dentro de 24h (${diferencaHoras.toFixed(1)}h), enviando email...`);
      await emailAgendamentoService.enviarLembreteAgendamento(agendamento);
    } else {
      console.log(`⏳ Agendamento com mais de 24h (${diferencaHoras.toFixed(1)}h), email será enviado posteriormente`);
    }
  } catch (error) {
    console.error('❌ Erro ao verificar envio de email:', error);
  }
}

router.post('/', async (req, res) => {
    console.log('📥 Recebendo requisição para criar agendamento:', req.body);
    
    const { servico, profissional, data, horario, nome, telefone, email } = req.body;

    if (!servico || !profissional || !data || !horario || !nome) {
        console.log('❌ Campos obrigatórios faltando');
        return res.status(400).json({ 
            error: 'Serviço, profissional, data, horário e nome são obrigatórios.' 
        });
    }

    try {
        console.log('🔍 Verificando disponibilidade no servidor...');
        
        const agendamentosExistentes = await prisma.agendamento.findMany({
            where: {
                data: data.trim(),
                horario: horario.trim(),
                status: {
                    in: ['pendente', 'confirmado']
                }
            }
        });

        const barbeiroOcupado = agendamentosExistentes.some(
            ag => ag.profissional === profissional.trim()
        );

        if (barbeiroOcupado) {
            console.log('❌ Barbeiro já está ocupado neste horário');
            return res.status(409).json({ 
                error: `${profissional} já está ocupado neste horário. Por favor, escolha outro horário ou profissional.` 
            });
        }

        if (agendamentosExistentes.length >= 3) {
            console.log('❌ Horário completamente ocupado');
            return res.status(409).json({ 
                error: 'Este horário já está completamente ocupado. Por favor, escolha outro horário.' 
            });
        }

        if (email) {
            const agendamentoMesmoDia = await prisma.agendamento.findFirst({
                where: {
                    email: email.trim(),
                    data: data.trim(),
                    status: {
                        in: ['pendente', 'confirmado']
                    }
                }
            });

            if (agendamentoMesmoDia) {
                console.log('❌ Usuário já tem agendamento neste dia');
                return res.status(409).json({ 
                    error: 'Você já possui um agendamento para este dia. Só é permitido um agendamento por dia.' 
                });
            }
        }

        console.log('📝 Criando agendamento no banco...');
        
        const novoAgendamento = await prisma.agendamento.create({
            data: {
                servico: servico.trim(),
                profissional: profissional.trim(),
                data: data.trim(),
                horario: horario.trim(),
                nome: nome.trim(),
                telefone: telefone ? telefone.trim() : null,
                email: email ? email.trim() : null,
                status: 'pendente'
            }
        });

        console.log('✅ Agendamento criado com sucesso:', novoAgendamento.id);
        
        emailAgendamentoService.enviarConfirmacaoAgendamento(novoAgendamento)
            .then(resultado => {
                if (resultado.success) {
                    console.log('✅ Email de confirmação enviado com sucesso');
                } else {
                    console.error('❌ Erro ao enviar email de confirmação:', resultado.message);
                }
            })
            .catch(error => {
                console.error('❌ Erro no envio de confirmação (não crítico):', error);
            });

        verificarEnvioEmailAgendamento(novoAgendamento).catch(error => {
            console.error('❌ Erro no envio de lembrete (não crítico):', error);
        });

        return res.status(201).json({
            message: 'Agendamento realizado com sucesso!',
            agendamento: novoAgendamento
        });

    } catch (error) {
        console.error('❌ Erro ao criar agendamento:', error);
        
        return res.status(500).json({ 
            error: 'Erro interno do servidor ao criar agendamento.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.post('/enviar-lembretes', verifyAdmin, async (req, res) => {
    try {
        console.log('👨‍💼 Admin solicitou envio de lembretes');
        
        const resultado = await emailAgendamentoService.verificarLembretesPendentes();
        
        return res.json({
            message: 'Verificação de lembretes concluída',
            ...resultado
        });
        
    } catch (error) {
        console.error('❌ Erro ao enviar lembretes:', error);
        return res.status(500).json({ 
            error: 'Erro interno ao enviar lembretes',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/status-email', verifyAdmin, async (req, res) => {
    try {
        const emailConfigurado = emailAgendamentoService.isEmailConfigured();
        
        return res.json({
            emailConfigurado,
            config: {
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                user: process.env.EMAIL_USER ? 'Configurado' : 'Não configurado'
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar status do email:', error);
        return res.status(500).json({ 
            error: 'Erro interno ao verificar status'
        });
    }
});

router.post('/:id/enviar-lembrete', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        console.log(`👨‍💼 Admin solicitou lembrete para agendamento: ${id}`);
        
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: parseInt(id) }
        });

        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }

        if (!agendamento.email) {
            return res.status(400).json({ error: 'Agendamento não possui email para envio.' });
        }

        const resultado = await emailAgendamentoService.enviarLembreteAgendamento(agendamento);
        
        if (resultado.success) {
            return res.json({
                message: 'Lembrete enviado com sucesso',
                ...resultado
            });
        } else {
            return res.status(500).json({
                error: 'Erro ao enviar lembrete',
                ...resultado
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao enviar lembrete específico:', error);
        return res.status(500).json({ 
            error: 'Erro interno ao enviar lembrete',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/', verifyAdmin, async (req, res) => {
    try {
        const agendamentos = await prisma.agendamento.findMany({
            orderBy: { criadoEm: 'desc' }
        });
        return res.json(agendamentos);
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
});

router.get('/public', async (req, res) => {
    try {
        console.log('📋 Buscando agendamentos públicos para verificação de disponibilidade...');
        
        const agendamentos = await prisma.agendamento.findMany({
            select: {
                id: true,
                servico: true,
                profissional: true,
                data: true,
                horario: true,
                status: true,
                email: true,
                nome: true
            },
            where: {
                status: {
                    in: ['pendente', 'confirmado']
                }
            },
            orderBy: [
                { data: 'asc' },
                { horario: 'asc' }
            ]
        });

        console.log(`✅ ${agendamentos.length} agendamentos públicos encontrados`);
        return res.json(agendamentos);
        
    } catch (error) {
        console.error('❌ Erro ao buscar agendamentos públicos:', error);
        return res.status(500).json({ 
            error: 'Erro ao buscar agendamentos',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor'
        });
    }
});

router.get('/meus-agendamentos', verifyToken, async (req, res) => {
    try {
        console.log('👤 Buscando agendamentos do usuário...');
        console.log('📋 Dados da requisição:');
        console.log('- User ID:', req.userId);
        console.log('- User Email:', req.userEmail);
        console.log('- isAdmin:', req.isAdmin);
        
        if (!req.userEmail) {
            console.log('❌ Email do usuário não encontrado no token');
            return res.status(400).json({ error: 'Email do usuário não encontrado no token.' });
        }

        console.log('📧 Buscando agendamentos para o email:', req.userEmail);

        const agendamentos = await prisma.agendamento.findMany({
            where: { 
                email: req.userEmail
            },
            orderBy: [ 
                { data: 'desc' },
                { horario: 'desc' }
            ]
        });

        console.log(`✅ ${agendamentos.length} agendamentos encontrados para o usuário`);
        return res.json(agendamentos);

    } catch (error) {
        console.error('❌ Erro ao buscar agendamentos do usuário:', error);
        return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
});

router.get('/cliente/:email', verifyToken, async (req, res) => {
    const { email } = req.params;

    try {
        console.log('👤 Verificando permissões para acessar agendamentos de:', email);
        console.log('👤 Usuário logado:', req.userEmail, 'Admin:', req.isAdmin);

        if (!req.isAdmin && req.userEmail !== email.toLowerCase()) {
            console.log('❌ Acesso negado - Usuário tentando acessar agendamentos de outro usuário');
            return res.status(403).json({ error: 'Acesso negado. Você só pode visualizar seus próprios agendamentos.' });
        }

        const agendamentos = await prisma.agendamento.findMany({
            where: { 
                email: email.toLowerCase() 
            },
            orderBy: [ 
                { data: 'desc' },
                { horario: 'desc' }
            ]
        });

        console.log(`✅ ${agendamentos.length} agendamentos encontrados para o cliente`);
        return res.json(agendamentos);
    } catch (error) {
        console.error('Erro ao buscar agendamentos do cliente:', error);
        return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
});

router.get('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: parseInt(id) }
        });

        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }

        if (!req.isAdmin && req.userEmail !== agendamento.email) {
            return res.status(403).json({ error: 'Acesso negado. Você só pode visualizar seus próprios agendamentos.' });
        }

        return res.json(agendamento);

    } catch (error) {
        console.error('Erro ao buscar agendamento por ID:', error);
        return res.status(500).json({ error: 'Erro interno ao buscar agendamento.' });
    }
});

router.patch('/:id/cancelar', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: parseInt(id) }
        });

        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }

        if (req.userEmail !== agendamento.email) {
            console.log('❌ Acesso negado - Usuário tentando cancelar agendamento de outro usuário');
            return res.status(403).json({ error: 'Acesso negado. Você só pode cancelar seus próprios agendamentos.' });
        }

        if (agendamento.status === 'cancelado') {
            return res.status(400).json({ error: 'Este agendamento já foi cancelado.' });
        }

        if (agendamento.status === 'concluido') {
            return res.status(400).json({ error: 'Não é possível cancelar um agendamento já concluído.' });
        }

        const agendamentoAtualizado = await prisma.agendamento.update({
            where: { id: parseInt(id) },
            data: {
                status: 'cancelado'
            }
        });

        return res.json({
            message: 'Agendamento cancelado com sucesso!',
            agendamento: agendamentoAtualizado
        });

    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        return res.status(500).json({ error: 'Erro interno ao cancelar agendamento.' });
    }
});

router.patch('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const statusValidos = ['pendente', 'confirmado', 'cancelado', 'concluido'];
    if (!status || !statusValidos.includes(status.toLowerCase())) {
        return res.status(400).json({ error: 'Status de agendamento inválido fornecido.' });
    }

    try {
        const agendamentoAtualizado = await prisma.agendamento.update({
            where: { id: parseInt(id) },
            data: {
                status: status.toLowerCase(),
            }
        });

        return res.json({
            message: 'Status do agendamento atualizado com sucesso!',
            agendamento: agendamentoAtualizado
        });

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return res.status(500).json({ error: 'Erro interno ao atualizar status do agendamento.' });
    }
});

router.put('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { servico, profissional, data, horario, nome, telefone, email, status } = req.body;

    try {
        const agendamentoExistente = await prisma.agendamento.findUnique({
            where: { id: parseInt(id) }
        });

        if (!agendamentoExistente) {
            return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }

        const agendamentoAtualizado = await prisma.agendamento.update({
            where: { id: parseInt(id) },
            data: {
                ...(servico && { servico: servico.trim() }),
                ...(profissional && { profissional: profissional.trim() }),
                ...(data && { data: data.trim() }),
                ...(horario && { horario: horario.trim() }),
                ...(nome && { nome: nome.trim() }),
                ...(telefone !== undefined && { telefone: telefone ? telefone.trim() : null }),
                ...(email !== undefined && { email: email ? email.trim() : null }),
                ...(status && { status: status.toLowerCase() })
            }
        });

        return res.json({
            message: 'Agendamento atualizado com sucesso!',
            agendamento: agendamentoAtualizado
        });

    } catch (error) {
        console.error('Erro ao atualizar agendamento:', error);
        return res.status(500).json({ error: 'Erro interno ao atualizar agendamento.' });
    }
});

router.delete('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const agendamentoExistente = await prisma.agendamento.findUnique({
            where: { id: parseInt(id) }
        });

        if (!agendamentoExistente) {
            return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }

        await prisma.agendamento.delete({
            where: { id: parseInt(id) }
        });

        return res.json({ message: 'Agendamento excluído com sucesso!' });

    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        return res.status(500).json({ error: 'Erro interno ao excluir agendamento.' });
    }
});

export default router;