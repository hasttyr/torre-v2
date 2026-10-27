import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfig } from '../config/app-config.js';
import type { Principal } from './auth-context.js';

/** Claims of the access token: the user and the session (refresh family) it belongs to. */
export interface AccessClaims {
  readonly sub: string;
  readonly sid: string;
}

/** `Authorization: Bearer <token>`, HS256 with JWT_ACCESS_SECRET; expired tokens are rejected. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(AppConfig) config: AppConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }

  validate(claims: AccessClaims): Principal {
    return { userId: claims.sub, sessionId: claims.sid };
  }
}
