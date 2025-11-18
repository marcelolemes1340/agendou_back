
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro_e_longo_para_jwt_token';

console.log('🔑 JWT_SECRET no middleware:', JWT_SECRET);

export const verifyToken = (req, res, next) => {
    console.log('🛣️  ROTA CHAMADA:', req.method, req.url);
    console.log('🔐 INICIANDO VERIFICAÇÃO DE TOKEN...');
    
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    console.log('📤 Authorization header:', authHeader ? 'Presente' : 'Ausente');
    console.log('🔑 Token extraído:', token ? `Presente (${token.substring(0, 20)}...)` : 'AUSENTE');

    if (!token) {
        console.log('❌ ERRO: Token não fornecido');
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    try {
        console.log('🔍 Decodificando token com secret:', JWT_SECRET);
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ TOKEN DECODIFICADO COM SUCESSO');
        console.log('📋 Dados decodificados do token:', JSON.stringify(decoded, null, 2));
        
        
        if (!decoded.id) {
            console.log('❌ ERRO: Campo "id" não encontrado no token');
            return res.status(403).json({ error: 'Token inválido: campo id não encontrado.' });
        }
        
        if (!decoded.email) {
            console.log('❌ ERRO: Campo "email" não encontrado no token');
            return res.status(403).json({ error: 'Token inválido: campo email não encontrado.' });
        }

        req.userId = parseInt(decoded.id);
        req.isAdmin = Boolean(decoded.isAdmin);
        req.userType = decoded.tipo || 'cliente';
        req.userEmail = decoded.email;
        
        console.log('👤 DADOS DO USUÁRIO CONFIGURADOS:');
        console.log('- ID:', req.userId);
        console.log('- Email:', req.userEmail);
        console.log('- isAdmin:', req.isAdmin);
        console.log('- Tipo:', req.userType);
        console.log('✅ MIDDLEWARE CONCLUÍDO - Chamando next()');
        
        next();
    } catch (error) {
        console.error('❌ ERRO AO VERIFICAR TOKEN:', error.message);
        console.error('Stack trace:', error.stack);
        return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
};

export const verifyAdmin = (req, res, next) => {
    console.log('👮 VERIFICANDO ADMIN...');
    verifyToken(req, res, () => {
        if (req.isAdmin === true) {
            console.log('✅ USUÁRIO É ADMIN - Acesso permitido');
            next();
        } else {
            console.log('❌ USUÁRIO NÃO É ADMIN - Acesso negado');
            return res.status(403).json({ error: 'Acesso negado. Requer permissão de administrador.' });
        }
    });
};