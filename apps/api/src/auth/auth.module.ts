import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfig } from '../config/app-config.js';
import { accessTokenOptions } from './access-token.js';
import { AuthContext } from './auth-context.js';
import { AUTH_LIMITS, AuthLimiter } from './auth-limiter.js';
import type { AuthLimits } from './auth-limiter.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';
import { PasswordService } from './password.service.js';

const authLimits = (config: AppConfig): AuthLimits => ({
  attempts: config.get('AUTH_THROTTLE_LIMIT'),
  windowMs: config.get('AUTH_THROTTLE_WINDOW'),
  lockoutMs: config.get('AUTH_LOCKOUT_DURATION'),
});

/**
 * Fortify-style authentication (DEC-057, AUTHORIZATION.md §11): registration, login with attempt
 * limits, access tokens checked on every request by a global guard, and refresh sessions (US-022).
 */
@Module({
  imports: [PassportModule, JwtModule.registerAsync({ inject: [AppConfig], useFactory: accessTokenOptions })],
  controllers: [AuthController],
  providers: [
    AuthContext,
    AuthService,
    AuthLimiter,
    { provide: AUTH_LIMITS, inject: [AppConfig], useFactory: authLimits },
    PasswordService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthContext],
})
export class AuthModule {}
