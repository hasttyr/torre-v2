import { Inject, Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { AppConfig } from '../config/app-config.js';

/** argon2id with the OWASP parameters of DEC-062 (ARGON2_*). Passwords are never logged. */
@Injectable()
export class PasswordService {
  private readonly options: { type: typeof argon2.argon2id; memoryCost: number; timeCost: number; parallelism: number };
  private dummy: Promise<string> | undefined;

  constructor(@Inject(AppConfig) config: AppConfig) {
    this.options = {
      type: argon2.argon2id,
      memoryCost: config.get('ARGON2_MEMORY_KIB'),
      timeCost: config.get('ARGON2_TIME_COST'),
      parallelism: config.get('ARGON2_PARALLELISM'),
    };
  }

  hash(password: string): Promise<string> {
    return argon2.hash(password, this.options);
  }

  verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  /**
   * Spends the same time as a real check when the account does not exist, so the answer time does
   * not reveal which emails have an account (US-022:AC1).
   */
  async verifyNothing(password: string): Promise<false> {
    this.dummy ??= this.hash('torre-dummy-password-for-timing');
    await argon2.verify(await this.dummy, password);
    return false;
  }
}
