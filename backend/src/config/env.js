import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5000', 10),
  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/aurelle',
    dbName: process.env.MONGODB_DB_NAME || 'aurelle',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'aurelle_luxury_jwt_secret_change_in_production_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  frontend: {
    urls: (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map((u) => u.trim().replace(/\/$/, ''))
      .filter(Boolean),
  },
  superAdmin: {
    email: process.env.SUPERADMIN_EMAIL ? process.env.SUPERADMIN_EMAIL.trim() : '',
    password: process.env.SUPERADMIN_PASSWORD || '',
    name: process.env.SUPERADMIN_NAME ? process.env.SUPERADMIN_NAME.trim() : 'Aurelle Platform Super Admin',
  },
};

// Validate production security invariants
if (config.isProduction) {
  const DEFAULT_JWT_SECRET = 'aurelle_luxury_jwt_secret_change_in_production_2026';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
    throw new Error(
      '[FATAL SECURITY MISCONFIGURATION] Production environment detected with default or missing JWT_SECRET. A secure, cryptographically random secret must be supplied.'
    );
  }
}

