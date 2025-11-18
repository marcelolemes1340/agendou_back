import { Router } from 'express';
import prisma from '../config/prisma.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();



router.get('/admin/todas-avaliacoes', verifyToken, async (req, res) => {
    try {
        if (!req.isAdmin) {
            console.log('❌ Acesso negado - usuário não é admin');
            return res.status(403).json({
                error: 'Acesso negado. Apenas administradores.'
            });
        }

        console.log('📊 ADMIN: Buscando TODAS as avaliações do sistema...');

        const avaliacoes = await prisma.avaliacao.findMany({
            include: {
                agendamento: {
                    select: {
                        id: true,
                        servico: true,
                        profissional: true,
                        data: true,
                        horario: true,
                        nome: true,
                        email: true,
                        telefone: true,
                        status: true,
                        criadoEm: true
                    }
                }
            },
            orderBy: {
                criadoEm: 'desc'
            }
        });

        console.log(`✅ ADMIN: ${avaliacoes.length} avaliações encontradas no sistema`);

        return res.json(avaliacoes);

    } catch (error) {
        console.error('❌ Erro ao buscar todas as avaliações (admin):', error);
        return res.status(500).json({
            error: 'Erro interno ao buscar avaliações.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/admin/todas', verifyToken, async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({
                error: 'Acesso negado. Apenas administradores.'
            });
        }

        console.log('📊 Buscando todas as avaliações (admin)...');

        const avaliacoes = await prisma.avaliacao.findMany({
            include: {
                agendamento: {
                    select: {
                        servico: true,
                        profissional: true,
                        data: true,
                        horario: true,
                        nome: true,
                        email: true,
                        telefone: true,
                        status: true
                    }
                }
            },
            orderBy: {
                criadoEm: 'desc'
            }
        });

        console.log(`✅ ${avaliacoes.length} avaliações encontradas`);

        return res.json(avaliacoes);

    } catch (error) {
        console.error('❌ Erro ao buscar todas as avaliações:', error);
        return res.status(500).json({
            error: 'Erro interno ao buscar avaliações.'
        });
    }
});

router.post('/', verifyToken, async (req, res) => {
    const { agendamentoId, nota, comentario } = req.body;
    const userId = req.userId;
    const userEmail = req.userEmail;

    console.log('⭐ Recebendo avaliação:', { agendamentoId, nota, comentario, userEmail });

    if (!agendamentoId || !nota) {
        return res.status(400).json({
            error: 'Agendamento ID e nota são obrigatórios.'
        });
    }

    if (nota < 1 || nota > 5) {
        return res.status(400).json({
            error: 'A nota deve ser entre 1 e 5 estrelas.'
        });
    }

    try {
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: parseInt(agendamentoId) },
            include: { avaliacao: true }
        });

        if (!agendamento) {
            return res.status(404).json({
                error: 'Agendamento não encontrado.'
            });
        }

        if (agendamento.email !== userEmail) {
            console.log('❌ Tentativa de avaliar agendamento de outro usuário:', {
                agendamentoEmail: agendamento.email,
                userEmail: userEmail
            });
            return res.status(403).json({
                error: 'Você só pode avaliar seus próprios agendamentos.'
            });
        }

        if (agendamento.status !== 'concluido') {
            return res.status(400).json({
                error: 'Só é possível avaliar agendamentos concluídos.'
            });
        }

        if (agendamento.avaliacao) {
            return res.status(409).json({
                error: 'Este agendamento já foi avaliado.'
            });
        }

        console.log('📝 Criando avaliação no banco...');

        const avaliacao = await prisma.avaliacao.create({
            data: {
                agendamentoId: parseInt(agendamentoId),
                nota: parseInt(nota),
                comentario: comentario ? comentario.trim() : null
            },
            include: {
                agendamento: {
                    select: {
                        servico: true,
                        profissional: true,
                        data: true,
                        horario: true
                    }
                }
            }
        });

        console.log('✅ Avaliação criada com sucesso:', avaliacao.id);

        return res.status(201).json({
            message: 'Avaliação registrada com sucesso!',
            avaliacao
        });

    } catch (error) {
        console.error('❌ Erro ao criar avaliação:', error);
        
        if (error.code === 'P2002') {
            return res.status(409).json({
                error: 'Este agendamento já foi avaliado.'
            });
        }

        return res.status(500).json({
            error: 'Erro interno do servidor ao criar avaliação.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/minhas-avaliacoes', verifyToken, async (req, res) => {
    const userEmail = req.userEmail;

    try {
        console.log('📊 Buscando avaliações do usuário:', userEmail);

        const avaliacoes = await prisma.avaliacao.findMany({
            where: {
                agendamento: {
                    email: userEmail
                }
            },
            include: {
                agendamento: {
                    select: {
                        servico: true,
                        profissional: true,
                        data: true,
                        horario: true,
                        status: true
                    }
                }
            },
            orderBy: {
                criadoEm: 'desc'
            }
        });

        console.log(`✅ ${avaliacoes.length} avaliações encontradas`);

        return res.json(avaliacoes);

    } catch (error) {
        console.error('❌ Erro ao buscar avaliações:', error);
        return res.status(500).json({
            error: 'Erro interno ao buscar avaliações.'
        });
    }
});

router.get('/agendamento/:agendamentoId', verifyToken, async (req, res) => {
    const { agendamentoId } = req.params;
    const userEmail = req.userEmail;

    try {
        console.log('🔍 Buscando avaliação do agendamento:', agendamentoId);

        const avaliacao = await prisma.avaliacao.findFirst({
            where: {
                agendamentoId: parseInt(agendamentoId),
                agendamento: {
                    email: userEmail
                }
            },
            include: {
                agendamento: {
                    select: {
                        servico: true,
                        profissional: true,
                        data: true,
                        horario: true
                    }
                }
            }
        });

        if (!avaliacao) {
            return res.status(404).json({
                error: 'Avaliação não encontrada para este agendamento.'
            });
        }

        return res.json(avaliacao);

    } catch (error) {
        console.error('❌ Erro ao buscar avaliação:', error);
        return res.status(500).json({
            error: 'Erro interno ao buscar avaliação.'
        });
    }
});

router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nota, comentario } = req.body;
    const userEmail = req.userEmail;

    console.log('✏️ Atualizando avaliação:', { id, nota, comentario });

    if (nota && (nota < 1 || nota > 5)) {
        return res.status(400).json({
            error: 'A nota deve ser entre 1 e 5 estrelas.'
        });
    }

    try {
        const avaliacaoExistente = await prisma.avaliacao.findUnique({
            where: { id: parseInt(id) },
            include: {
                agendamento: {
                    select: { email: true }
                }
            }
        });

        if (!avaliacaoExistente) {
            return res.status(404).json({
                error: 'Avaliação não encontrada.'
            });
        }

        if (avaliacaoExistente.agendamento.email !== userEmail) {
            return res.status(403).json({
                error: 'Você só pode editar suas próprias avaliações.'
            });
        }

        const avaliacaoAtualizada = await prisma.avaliacao.update({
            where: { id: parseInt(id) },
            data: {
                ...(nota && { nota: parseInt(nota) }),
                ...(comentario !== undefined && { comentario: comentario ? comentario.trim() : null })
            },
            include: {
                agendamento: {
                    select: {
                        servico: true,
                        profissional: true,
                        data: true,
                        horario: true
                    }
                }
            }
        });

        console.log('✅ Avaliação atualizada com sucesso:', id);

        return res.json({
            message: 'Avaliação atualizada com sucesso!',
            avaliacao: avaliacaoAtualizada
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar avaliação:', error);
        return res.status(500).json({
            error: 'Erro interno ao atualizar avaliação.'
        });
    }
});

router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const userEmail = req.userEmail;

    try {
        const avaliacao = await prisma.avaliacao.findUnique({
            where: { id: parseInt(id) },
            include: {
                agendamento: {
                    select: { email: true }
                }
            }
        });

        if (!avaliacao) {
            return res.status(404).json({
                error: 'Avaliação não encontrada.'
            });
        }

        if (avaliacao.agendamento.email !== userEmail) {
            return res.status(403).json({
                error: 'Você só pode excluir suas próprias avaliações.'
            });
        }

        await prisma.avaliacao.delete({
            where: { id: parseInt(id) }
        });

        console.log('✅ Avaliação excluída com sucesso:', id);

        return res.json({
            message: 'Avaliação excluída com sucesso!'
        });

    } catch (error) {
        console.error('❌ Erro ao excluir avaliação:', error);
        return res.status(500).json({
            error: 'Erro interno ao excluir avaliação.'
        });
    }
});

router.get('/admin/estatisticas', verifyToken, async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({
                error: 'Acesso negado. Apenas administradores.'
            });
        }

        const [
            totalAvaliacoes,
            mediaGeral,
            distribuiçãoNotas,
            avaliacoesComComentario
        ] = await Promise.all([
            prisma.avaliacao.count(),
            prisma.avaliacao.aggregate({
                _avg: { nota: true }
            }),
            prisma.avaliacao.groupBy({
                by: ['nota'],
                _count: { nota: true }
            }),
            prisma.avaliacao.count({
                where: { comentario: { not: null } }
            })
        ]);

        const estatisticas = {
            totalAvaliacoes,
            mediaGeral: Math.round((mediaGeral._avg.nota || 0) * 10) / 10,
            distribuiçãoNotas: distribuiçãoNotas.reduce((acc, item) => {
                acc[item.nota] = item._count.nota;
                return acc;
            }, {}),
            avaliacoesComComentario,
            taxaComentarios: totalAvaliacoes > 0 ? 
                Math.round((avaliacoesComComentario / totalAvaliacoes) * 100) : 0
        };

        return res.json(estatisticas);

    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        return res.status(500).json({
            error: 'Erro interno ao buscar estatísticas.'
        });
    }
});

export default router;