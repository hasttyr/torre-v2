// Entry point of @torre/api.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AppConfig } from './config/app-config.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(await AppModule.forRoot());
  await app.listen(app.get(AppConfig).get('PORT'));
}

await bootstrap();
