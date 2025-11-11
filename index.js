import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import agendamentoRoutes from './routes/agendamentos.js';
import usuarioRoutes from './routes/usuarios.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/adminRoutes.js'; // ⬅️ IMPORTAÇÃO DA NOVA ROTA ADMIN

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Configuração de CORS para permitir acesso do frontend admin (3000)
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
};

app.use(cors(corsOptions));
app.use(json());

// Rotas
// A rota de admin deve vir antes do auth para garantir que o cadastro inicial funcione.
app.use('/api/admin', adminRoutes); // ⬅️ CORRIGIDO: Agora tem o prefixo /api
app.use('/api/auth', authRoutes); // CORRIGIDO: Agora tem o prefixo /api
app.use('/api/agendamentos', agendamentoRoutes); // CORRIGIDO: Agora tem o prefixo /api
app.use('/api/usuarios', usuarioRoutes); // CORRIGIDO: Agora tem o prefixo /api

app.get('/', (req, res) => {
    res.send('API de Agendamento está funcionando!');
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});