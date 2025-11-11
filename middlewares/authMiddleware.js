import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro_e_longo';

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.isAdmin = decoded.isAdmin;
        req.userType = decoded.tipo;
        next();
    } catch {
        return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
};

export const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.isAdmin === true) next();
        else return res.status(403).json({ error: 'Acesso negado. Requer permissão de administrador.' });
    });
};
