import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import agendamentoRoutes from './routes/agendamentos.js';
import usuarioRoutes from './routes/usuarios.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/adminRoutes.js';
import barbeiroRoutes from './routes/barbeiros.js';
import emailRoutes from './routes/emailRoutes.js';
import avaliacoesRoutes from './routes/avaliacoes.js';
import executarVerificacaoLembretes from './scripts/verificarLembretes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

console.log('🚀 Iniciando servidor backend...');
console.log('🔑 JWT_SECRET:', process.env.JWT_SECRET ? 'Configurado' : 'Usando padrão');

function iniciarAgendamentoLembretes() {    
    setTimeout(async () => {
        try {
            await executarVerificacaoLembretes();
        } catch (error) {
            console.error('❌ ERRO NA PRIMEIRA VERIFICAÇÃO:', error);
        }
    }, 15000); 

    const intervalo = setInterval(async () => {
        try {
            await executarVerificacaoLembretes();
            console.log('✅ VERIFICAÇÃO AGENDADA CONCLUÍDA');
        } catch (error) {
            console.error('❌ ERRO NA VERIFICAÇÃO AGENDADA:', error);
        }
    }, 60 * 60 * 1000);

    console.log('✅ AGENDADOR DE LEMBRETES CONFIGURADO');
    
    return intervalo;
}

app.use(cors({
    origin: ['http://localhost:3000','https://agendoou-admin.vercel.app','https://agendou-nine.vercel.app','http://agendou-nine.vercel.app', 'http://localhost:3002','http://agendoou-admin.vercel.app',],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(json());

app.use((req, res, next) => {
    console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
    next();
});

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/barbeiros', barbeiroRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/avaliacoes', avaliacoesRoutes);


app.get('/status-lembretes', (req, res) => {
    res.json({
        service: 'Agendador de Lembretes',
        status: 'Ativo',
        proximaVerificacao: 'A cada 1 hora',
        ultimaExecucao: new Date().toISOString(),
        configuracao: {
            intervalo: '60 minutos',
            timeoutInicial: '15 segundos'
        }
    });
});

app.get('/', (req, res) => {
    res.json({
        message: 'API de Agendamento está funcionando!',
        version: '1.0.0',
        services: {
            lembretes: 'Ativo - Envio automático 24h antes'
        },
        endpoints: {
            auth: '/api/auth',
            admin: '/api/admin',
            agendamentos: '/api/agendamentos',
            usuarios: '/api/usuarios',
            status: '/health',
            lembretes: '/status-lembretes'
        }
    });
});

app.use((req, res) => {
    console.log('❌ Rota não encontrada:', req.method, req.url);
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.originalUrl,
        method: req.method
    });
});

app.use((error, req, res, next) => {
    console.error('❌ Erro não tratado:', error);
    res.status(500).json({
        error: 'Erro interno do servidor',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
});

app.listen(port, () => {
    console.log(`🎉 Servidor rodando em http://localhost:${port}`);
    console.log(`🔔 Status lembretes: http://localhost:${port}/status-lembretes`);
    console.log(`🌐 CORS habilitado para: localhost:3000, localhost:3002`);
    
    iniciarAgendamentoLembretes();
});

export default app;