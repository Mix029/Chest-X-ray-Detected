const jwt = require('jsonwebtoken');

const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    const token = req.header('x-auth-token');

    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'yoursecretkey');
      req.user = decoded.user;

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ msg: 'Role not authorized' });
      }

      next();
    } catch (err) {
      res.status(401).json({ msg: 'Token is not valid' });
    }
  };
};

module.exports = authMiddleware;
