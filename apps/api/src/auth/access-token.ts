import type { JwtModuleOptions } from '@nestjs/jwt';
import type { AppConfig } from '../config/app-config.js';

/**
 * How access tokens are signed and checked (DEC-062): HS256 with JWT_ACCESS_SECRET and a life of
 * JWT_ACCESS_TTL. Shared by the auth module and the rate limiter, which counts signed-in users by id.
 */
export const accessTokenOptions = (config: AppConfig): JwtModuleOptions => ({
  secret: config.get('JWT_ACCESS_SECRET'),
  signOptions: { algorithm: 'HS256', expiresIn: Math.floor(config.get('JWT_ACCESS_TTL') / 1000) },
  verifyOptions: { algorithms: ['HS256'] },
});
