/**
 * @file jwt.js
 * @description Cryptographic JSON Web Token (JWT) utility helpers for token generation and verification.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Signs and issues a JSON Web Token with the application secret.
 * @param {Object} payload - Data payload to encode in the token
 * @param {string|number} [expiresIn=config.jwt.expiresIn] - Expiration duration (e.g. '7d')
 * @returns {string} Signed JWT token string
 */
export const generateToken = (payload, expiresIn = config.jwt.expiresIn) => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
};

/**
 * Verifies and decodes a signed JWT token against the application secret.
 * @param {string} token - Signed JWT token string
 * @returns {Object} Decoded payload object
 * @throws {JsonWebTokenError|TokenExpiredError} When signature is invalid or expired
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

