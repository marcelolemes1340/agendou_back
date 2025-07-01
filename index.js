import express, { json } from 'express';
import cors from 'cors'; // permite requisições do front-end
import agendamentoRoutes from './routes/agendamentos.js';
import usuarioRoutes from './routes/usuarios.js';


const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(json()); // para ler JSON no corpo das requisições

// Rotas
app.use('/agendamentos', agendamentoRoutes);
app.use('/usuarios', usuarioRoutes);

app.get('/', (req, res) => {
    res.send('API de Agendamento está funcionando!');
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
