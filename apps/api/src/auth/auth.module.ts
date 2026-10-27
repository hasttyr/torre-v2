import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfig } from '../config/app-config.js';
import { AuthContext } from './auth-context.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';
import { PasswordService } from './password.service.js';

/**
 * Fortify-style authentication (DEC-057, AUTHORIZATION.md §11): registration, login, access tokens
 * checked on every request by a global guard, and refresh sessions (US-022).
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: { algorithm: 'HS256', expiresIn: Math.floor(config.get('JWT_ACCESS_TTL') / 1000) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthContext, AuthService, PasswordService, JwtStrategy, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [AuthContext],
})
export class AuthModule {}
