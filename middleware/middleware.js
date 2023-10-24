const jwt = require('jsonwebtoken');

// Middleware para verificar el token JWT
function verifyToken(req, res, next) {
  const authHeader  = req.headers.authorization;
  if (authHeader  && authHeader .startsWith('Bearer ')) {
    
    const token = authHeader.replace('Bearer ', '');
    jwt.verify(token, 'secreto', (err, decoded) => {
      if (err) {
        res.status(403).json({ error: 'Token inválido' });
      } else {
        // Guardar los datos del usuario en el objeto de solicitud (req) para su uso posterior
        req.usuario = decoded;
        next();
      }
    });
  } else {
    res.status(403).json({ error: 'Token no proporcionado' });
  }
}

module.exports = verifyToken;
