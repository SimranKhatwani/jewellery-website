import jwt from 'jsonwebtoken';

export const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. No bearer token provided.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || 'aurelle_luxury_jwt_secret_change_in_production_2026';

  try {
    const decoded = jwt.verify(token, jwtSecret);

    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication session.',
    });
  }
};

