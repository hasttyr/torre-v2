// Entry point of @torre/api.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { AppConfig } from './config/app-config.js';

async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create(await AppModule.forRoot(), { bufferLogs: true }));
  await app.listen(app.get(AppConfig).get('PORT'));
}

await bootstrap();
